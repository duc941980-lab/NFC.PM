const { execSync } = require('child_process');
try {
  console.log(execSync('git checkout -- src/components/InspectionForm.tsx').toString());
  console.log('Revert successful!');
} catch (e) {
  console.log('Error reverting: ' + e.message + '\n' + (e.stderr ? e.stderr.toString() : ''));
}

