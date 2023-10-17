
# StressGPT

[![npm version](https://img.shields.io/npm/v/stressgpt)](https://www.npmjs.com/package/stressgpt)
[![License](https://img.shields.io/github/license/happyme531/stressgpt)](https://github.com/happyme531/stressgpt/blob/main/LICENSE)

StressGPT is a Node.js program for stress testing the OpenAI API (or compatiable ones built locally) using the specified model. It allows you to send multiple concurrent requests to the API and measure the performance.

## Installation

```bash
npm install stressgpt
```

## Usage

### Command Line: stressgpt

The stressgpt command line program is included with the library. You can use it to easily run stress tests from the terminal.

```bash
stressgpt [options]
```

Options:
- `-b, --api-base <api-base>`: API base URL (default: `https://api.openai.com/v1`)
- `-k, --api-key <api-key>`: API key (default: `$OPENAI_API_KEY`)
- `-m, --model <model>`: Model ID (default: `"text-davinci-003"`)
- `-t, --concurrent <concurrency>`: Number of concurrent requests (default: `1`)
- `-c, --count <count>`: Number of requests (default: same as concurrency)
- `-p, --prompt-file <prompt-file>`: Prompt file (.txt) (default: built-in prompt)
- `-x, --context-length <context-length>`: Prefill each conversation with this many tokens (default: `0`)
- `--early-stop`: Stop when the remaining requests is 0

### Library Usage

```javascript
import StressGPT from 'stressgpt';

// Configure the stress test options
const options = {
  apiBase: 'https://api.openai.com/v1', // The base URL of the OpenAI API
  apiKey: 'YOUR_API_KEY', // Your OpenAI API key
  model: 'text-davinci-003', // The model ID to use (default: "text-davinci-003")
  concurrent: 5, // Number of concurrent requests (default: 1)
  count: 10, // Number of requests (default: same as concurrency)
  promptFile: 'prompt.txt', // Path to the prompt file (default: built-in prompt)
  contextLength: 0, // Prefill each conversation with this many tokens (default: 0)
  earlyStop: true // Stop when the remaining requests is 0 (default: false)
};

// Create an instance of StressGPT
const stressTest = new StressGPT(options);

// Run the stress test
stressTest.run();

// Stop the stress test gracefully on SIGINT (Ctrl+C)
process.on('SIGINT', async () => {
  await stressTest.stop();
  process.exit(0);
});
```

## Options

- `apiBase`: (string) The base URL of the OpenAI API. Default is `https://api.openai.com/v1`.
- `apiKey`: (string) Your OpenAI API key.
- `model`: (string) The model ID to use. Default is `"text-davinci-003"`.
- `concurrent`: (number) Number of concurrent requests. Default is `1`.
- `count`: (number) Number of requests. Default is the same as `concurrent`.
- `promptFile`: (string) Path to the prompt file. Default is a built-in prompt.
- `contextLength`: (number) Prefill each conversation with this many tokens. Default is `0`.
- `earlyStop`: (boolean) Stop when the remaining requests is 0. Default is `false`.

## License

This project is licensed under the [MIT License](https://github.com/happyme531/stressgpt/blob/main/LICENSE).