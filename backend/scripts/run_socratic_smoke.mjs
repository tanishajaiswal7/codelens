import { analyzeCodeForBugs } from '../services/socratic-service/services/socraticService.js'

const sample = `function calculateAverage(numbers) {
  let total = 0;
  for (let i = 0; i <= numbers.length; i++) {
    total += numbers[i];
  }
  return total / numbers.length;
}

function getUserScore(user) {
  return calculateAverage(user.scores);
}
`

async function run() {
  try {
    const bugs = await analyzeCodeForBugs(sample, 'faang')
    console.log('Detected bugs:', JSON.stringify(bugs, null, 2))
    console.log('Total:', bugs.length)
  } catch (err) {
    console.error('Smoke test failed:', err)
  }
}

run()
