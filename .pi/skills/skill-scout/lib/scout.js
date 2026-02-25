#!/usr/bin/env node
/**
 * Scout Module - Skill Discovery from GitHub
 * 
 * Searches GitHub for Pi-skill repositories
 * Based on ZeroClaw's GitHubScout
 * 
 * @module scout
 * @author PopeBot (adapted from ZeroClaw)
 */

const fs = require('fs').promises;
const path = require('path');
const https = require('https');

// Cache configuration
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const DEFAULT_QUERIES = [
  'pi-skill',
  'popebot-skill',
  'claude-skill',
  'ai-agent-skill',
  'SKILL.md in:readme'
];

class Scout {
  constructor(options = {}) {
    this.cacheDir = options.cacheDir || './.scout/cache';
    this.queries = options.queries || DEFAULT_QUERIES;
    this.githubToken = options.githubToken;
    this.ensureCacheDir();
  }

  async ensureCacheDir() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (err) {
      // Directory may already exist
    }
  }

  /**
   * Discover skills from GitHub
   * @param {Object} params - Discovery parameters
   * @returns {Promise<Array>} Discovered skills
   */
  async discover(params = {}) {
    const { query, limit = 30 } = params;
    const searchQueries = query ? [query] : this.queries;
    
    console.log(`🔍 Searching for skills...`);
    
    const allResults = [];
    
    for (const q of searchQueries) {
      try {
        const results = await this.searchGitHub(q, limit);
        allResults.push(...results);
      } catch (err) {
        console.warn(`⚠️ Query "${q}" failed: ${err.message}`);
      }
    }
    
    // Deduplicate by URL
    const deduped = this.deduplicate(allResults);
    
    // Cache results
    await this.cacheResults(deduped);
    
    // Filter for SKILL.md presence (basic check)
    const withSkillMd = await this.filterWithSkillMd(deduped);
    
    console.log(`✅ Found ${withSkillMd.length} potential skills (from ${deduped.length} repos)`);
    
    return withSkillMd.slice(0, limit);
  }

  /**
   * Search GitHub API for repositories
   * @param {string} query - Search query
   * @param {number} limit - Max results per query
   * @returns {Promise<Array>} Repository results
   */
  async searchGitHub(query, limit = 30) {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.github.com/search/repositories?q=${encodedQuery}&sort=stars&order=desc&per_page=${limit}`;
    
    const options = {
      headers: {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'PopeBot-SkillScout/1.0',
        ...(this.githubToken && { 'Authorization': `Bearer ${this.githubToken}` })
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.get(url, options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            
            if (json.message) {
              // GitHub API error
              reject(new Error(json.message));
              return;
            }
            
            const items = json.items || [];
            const results = items.map(item => ({
              id: item.id,
              name: item.name,
              full_name: item.full_name,
              url: item.html_url,
              description: item.description || '',
              stars: item.stargazers_count || 0,
              language: item.language,
              updated_at: item.updated_at,
              created_at: item.created_at,
              owner: item.owner?.login || 'unknown',
              owner_type: item.owner?.type,
              forks: item.forks_count,
              open_issues: item.open_issues_count,
              has_wiki: item.has_wiki,
              has_pages: item.has_pages,
              has_license: item.license ? true : false,
              license: item.license?.spdx_id,
              topics: item.topics || [],
              archived: item.archived,
              fork: item.fork,
              size: item.size,
              source: 'github',
              discovered_at: new Date().toISOString()
            }));
            
            resolve(results);
          } catch (err) {
            reject(new Error(`Failed to parse GitHub response: ${err.message}`));
          }
        });
      });
      
      req.on('error', (err) => {
        reject(new Error(`GitHub API request failed: ${err.message}`));
      });
      
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('GitHub API request timed out'));
      });
    });
  }

  /**
   * Filter repositories that likely have SKILL.md
   * @param {Array} repos - Repository list
   * @returns {Array} Repos with probable SKILL.md
   */
  async filterWithSkillMd(repos) {
    // For each repo, check if it has a SKILL.md file
    const checked = await Promise.all(
      repos.map(async (repo) => {
        try {
          const hasSkillMd = await this.checkHasSkillMd(repo.full_name);
          return hasSkillMd ? repo : null;
        } catch {
          return null;
        }
      })
    );
    
    return checked.filter(Boolean);
  }

  /**
   * Check if a GitHub repo has SKILL.md
   * @param {string} fullName - Repository full name (owner/repo)
   * @returns {Promise<boolean>}
   */
  async checkHasSkillMd(fullName) {
    // Try multiple paths where SKILL.md might be found
    const paths = [
      'SKILL.md',
      '.pi/skills/SKILL.md',
      'skills/SKILL.md',
      'pi-skills/SKILL.md'
    ];
    
    for (const p of paths) {
      try {
        const exists = await this.checkFileExists(fullName, p);
        if (exists) return true;
      } catch {
        // Continue to next path
      }
    }
    
    return false;
  }

  /**
   * Check if a file exists in a GitHub repo
   * @param {string} fullName - Repository full name
   * @param {string} filePath - File path
   * @returns {Promise<boolean>}
   */
  async checkFileExists(fullName, filePath) {
    const url = `https://api.github.com/repos/${fullName}/contents/${filePath}`;
    
    const options = {
      headers: {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'PopeBot-SkillScout/1.0'
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.get(url, options, (res) => {
        resolve(res.statusCode === 200);
      });
      
      req.on('error', () => reject(false));
      req.setTimeout(5000, () => {
        req.destroy();
        reject(false);
      });
    });
  }

  /**
   * Deduplicate results by URL
   * @param {Array} results - Results array
   * @returns {Array} Deduplicated array
   */
  deduplicate(results) {
    const seen = new Map();
    
    for (const result of results) {
      if (!seen.has(result.url) || seen.get(result.url).stars < result.stars) {
        seen.set(result.url, result);
      }
    }
    
    return Array.from(seen.values());
  }

  /**
   * Cache results to disk
   * @param {Array} results - Results to cache
   */
  async cacheResults(results) {
    try {
      const cacheFile = path.join(this.cacheDir, 'discoveries.json');
      const data = {
        timestamp: new Date().toISOString(),
        count: results.length,
        results
      };
      await fs.writeFile(cacheFile, JSON.stringify(data, null, 2));
    } catch (err) {
      console.warn('Failed to cache results:', err.message);
    }
  }

  /**
   * Get cached discoveries
   * @returns {Promise<Array>} Cached results
   */
  async getCachedDiscoveries() {
    try {
      const cacheFile = path.join(this.cacheDir, 'discoveries.json');
      const data = await fs.readFile(cacheFile, 'utf-8');
      const parsed = JSON.parse(data);
      
      // Check cache is not stale
      const cacheAge = Date.now() - new Date(parsed.timestamp).getTime();
      if (cacheAge > CACHE_TTL) {
        console.log('⚠️ Cache is stale, consider running discover again');
      }
      
      return parsed.results || [];
    } catch {
      return [];
    }
  }

  /**
   * Get discovery statistics
   * @returns {Promise<Object>} Statistics
   */
  async getStats() {
    const discoveries = await this.getCachedDiscoveries();
    
    const bySource = {};
    const byLanguage = {};
    const byDate = {};
    
    for (const d of discoveries) {
      bySource[d.source] = (bySource[d.source] || 0) + 1;
      byLanguage[d.language || 'unknown'] = (byLanguage[d.language || 'unknown'] || 0) + 1;
      const date = d.discovered_at?.split('T')[0];
      if (date) byDate[date] = (byDate[date] || 0) + 1;
    }
    
    return {
      total: discoveries.length,
      bySource,
      byLanguage,
      byDate
    };
  }
}

module.exports = { Scout };
