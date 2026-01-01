import { randomString } from '@sdflc/utils';
import { padStart } from 'lodash';
import { randomInt } from 'crypto';
import { OP_RESULT_CODES } from '@sdflc/api-helpers';

type LoadTestMode = 'burst' | 'even';

interface LoadTestOptions {
  mode: LoadTestMode;
  requestsPerSecond: number;
  totalRequests: number;
}

export const loadTest = async (options: LoadTestOptions) => {
  const { mode, requestsPerSecond, totalRequests } = options;

  //const formUrl = 'http://localhost:4100/api/submissions/1c01cf5b-3cd0-422e-8944-f409ceb2f219'; // form with email dns+mx+uniqueness check, lookup field
  const formUrl = 'http://localhost:4100/api/submissions/8a83042c-6dd4-460c-af7b-de6962042d06'; // simple contact us form: name + email + message

  let submittedNumber = 1;
  const lookupValues = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'];
  const responseTimes: number[] = [];
  let successCount = 0;
  let failCount = 0;

  const sendSubmission = async (num: number): Promise<void> => {
    const submittedId = padStart('' + num, 5, '0');
    const formData = {
      name: 'Tester ' + submittedId,
      email: 'sd+' + randomString(5, 'abcdefghijklmnopqrstuvwxyz') + '@grassequal.com',
      lookup: lookupValues[randomInt(lookupValues.length - 1)],
      message: `Hello, I am submitter #${submittedId}. Do you like how it works?`,
    };

    const startTime = performance.now();

    try {
      const response = await fetch(formUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Referer: 'http://localhost',
        },
        body: JSON.stringify(formData),
      });

      const endTime = performance.now();
      const duration = endTime - startTime;
      responseTimes.push(duration);

      const result = await response.json();
      const success = response.status === 200 && result.code === OP_RESULT_CODES.OK;

      if (success) {
        successCount++;
      } else {
        failCount++;
      }

      console.log(`#${submittedId}: ${response.status} ${success ? '✓' : '✗'} - ${duration.toFixed(1)}ms`);
    } catch (error: any) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      responseTimes.push(duration);
      failCount++;
      console.error(`#${submittedId}: Failed - ${duration.toFixed(1)}ms -`, error.message);
    }
  };

  const calculateMedian = (arr: number[]): number => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  const calculateAverage = (arr: number[]): number => {
    if (arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  };

  const printStats = (elapsed: number) => {
    console.log('---');
    console.log(`Completed ${responseTimes.length}/${totalRequests} requests in ${elapsed.toFixed(2)}s`);
    console.log(`Success: ${successCount} | Failed: ${failCount}`);
    console.log(`Average response time: ${calculateAverage(responseTimes).toFixed(1)}ms`);
    console.log(`Median response time: ${calculateMedian(responseTimes).toFixed(1)}ms`);
    console.log(`Min: ${Math.min(...responseTimes).toFixed(1)}ms`);
    console.log(`Max: ${Math.max(...responseTimes).toFixed(1)}ms`);
  };

  console.log(`Starting load test [${mode.toUpperCase()}]: ${requestsPerSecond} req/s, ${totalRequests} total`);
  console.log(`Target: ${formUrl}`);
  console.log('---');

  const startTime = Date.now();

  if (mode === 'burst') {
    // Burst mode: fire N requests simultaneously every second
    const totalBursts = Math.ceil(totalRequests / requestsPerSecond);

    for (let burst = 0; burst < totalBursts; burst++) {
      const remainingRequests = totalRequests - burst * requestsPerSecond;
      const batchSize = Math.min(requestsPerSecond, remainingRequests);

      const promises: Promise<void>[] = [];
      for (let i = 0; i < batchSize; i++) {
        promises.push(sendSubmission(submittedNumber++));
      }

      await Promise.all(promises);
      console.log(`--- Burst ${burst + 1}/${totalBursts} complete ---`);

      if (burst < totalBursts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  } else {
    // Even mode: distribute requests evenly across time
    const delayMs = 1000 / requestsPerSecond;
    const promises: Promise<void>[] = [];

    for (let i = 0; i < totalRequests; i++) {
      promises.push(sendSubmission(submittedNumber++));
      if (i < totalRequests - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    // Wait for all in-flight requests to complete
    await Promise.all(promises);
  }

  const elapsed = (Date.now() - startTime) / 1000;
  printStats(elapsed);
};
