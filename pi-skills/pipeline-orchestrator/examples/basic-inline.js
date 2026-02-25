// Example: Inline Pipeline Test
// Run with: node cli.js run "fetch --url https://jsonplaceholder.typicode.com/posts/1 | analyze --prompt 'Summarize'"

import { parseInlinePipeline, executePipeline } from '../pipeline.js';

async function main() {
  console.log('Inline Pipeline Example');
  console.log('=======================\n');
  
  const pipeline = parseInlinePipeline(
    'fetch --url https://jsonplaceholder.typicode.com/posts/1 | ' +
    'analyze --prompt "Summarize this post" | ' +
    'analyze --prompt "Generate tags based on: {{analyze}}"'
  );
  
  console.log('Pipeline:', pipeline.name);
  console.log('Stages:', pipeline.stages.length);
  console.log('');
  
  pipeline.stages.forEach((stage, i) => {
    console.log(`${i + 1}. ${stage.type}`);
    console.log('   Config:', JSON.stringify(stage.config));
  });
  
  console.log('\nExecuting...\n');
  
  const result = await executePipeline(pipeline);
  console.log('\nResult:');
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
