import { buildConfig } from '@sdflc/backend-helpers';

const config = buildConfig(__dirname, {
  envFile: '../.env',
  envFileExample: '../.env.example',
  defaultNodeEnv: 'development',
});

export default {
  ...config,
  currencies: (config.allowedCurrencies || '').split(','),
  skipHeaders: {
    host: true,
    connection: true,
    'content-length': true,
    'sec-ch-ua': true,
    accept: true,
    'content-type': true,
    'sec-ch-ua-mobile': true,
    'sec-ch-ua-platform': true,
    origin: true,
    'sec-fetch-site': true,
    'sec-fetch-mode': true,
    'sec-fetch-dest': true,
    'accept-encoding': true,
    'accept-language': true,
  },
};
