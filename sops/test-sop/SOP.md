## Steps

1. **Initialize Test**
   Print starting message
   ```bash
   echo "Starting test SOP at $(date)"
   ```

2. **Check Environment** [if: SKIP_ENV_CHECK]
   This step is skipped unless SKIP_ENV_CHECK is true
   ```bash
   echo "Checking environment..."
   env | head -5
   ```

3. **Create Test File**
   Create a temporary test file
   ```bash
   echo "Test file created at $(date)" > /job/tmp/sop-test-$(date +%s).txt
   ls -la /job/tmp/sop-test-*.txt | tail -1
   ```

4. **Run Validation**
   Validate that the file was created
   ```bash
   test -f /job/tmp/sop-test-*.txt && echo "Validation passed" || echo "Validation failed"
   ```

5. **Completion Step**
   Print completion message
   ```bash
   echo "✅ Test SOP completed successfully"
   ```
