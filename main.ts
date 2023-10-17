#!/usr/bin/env node
import { program } from 'commander';
import OpenAI from 'openai';
import { LoremIpsum } from "lorem-ipsum";
import tracer from 'tracer';
import fs from 'fs';

class StressGPT {
  private openai: OpenAI;
  private modelName: string;
  private concurrency: number;
  private promptList: string[];
  private contextLength: number;
  private prefillContent: string;
  private lastGeneratedCount: number;
  private speedUpdateInterval: NodeJS.Timeout | undefined;
  private activeStates: boolean[];
  private earlyStop: boolean;
  currentSpeed: number;
  running: boolean;
  count: number;
  generatedCount: number;

  constructor(options: {
    openai: OpenAI,
    modelName: string,
    concurrency: number,
    count: number,
    promptFile: string | undefined,
    contextLength: number,
    earlyStop: boolean
  }) {
    const {
      openai,
      modelName,
      concurrency,
      count,
      promptFile,
      contextLength,
      earlyStop
    } = options;

    this.openai = openai;
    this.modelName = modelName;
    this.concurrency = concurrency;
    this.count = count;
    this.promptList = this.getPromptList(promptFile);
    this.contextLength = contextLength;
    this.prefillContent = "";
    this.lastGeneratedCount = 0;
    this.running = false;
    this.speedUpdateInterval = undefined;
    this.activeStates = new Array(concurrency).fill(false);
    this.currentSpeed = 0;
    this.generatedCount = 0;
    this.earlyStop = earlyStop;
  }


  private readonly logger = tracer.colorConsole();

  private readonly BUILTIN_PROMPTS = [
    "generate a c program with total length of 2000 words",
    "explain quantum science in 20000 words",
    "write a 10000 word essay comparing cats and dogs",
    "Generate a 10000 word essay on the topic of 'The importance of being earnest'",
    "give me a summary of the book 'The Great Gatsby' in 5000 words",
    "analyze the advantages and disadvantages of the internet in 10000 words",
    "Do a brief analysis of current state of Artificial Intelligence in 10000 words",
    "How can I be rich? Give me a answer in 10000 words",
    "What is the meaning of life? Explain in 10000 words",
    "Write a convolutional neural network in pytorch, the code should be at least 10000 words long",
    "Give me a full red-black tree implementation in C++, at least 10000 words long",
    "Write a 15,000 word research paper on the history of rock music from the 1950s to the present day.",
    "Provide a detailed 20,000 word overview explaining the key events and figures of the French Revolution.",
    "Describe the main themes and plot points of Homer's Odyssey in a 10,000 word essay.",
    "Compose a 12,000 word biography profiling the life and achievements of Albert Einstein.",
    "Explain the causes and long-term impacts of World War II in Europe in a 25,000 word essay.",
    "Analyze the key events and turning points of the US Civil War in a 30,000 word essay.",
    "Discuss the major scientific discoveries and theories of Isaac Newton in a 20,000 word essay.",
    "Provide a comprehensive overview of William Shakespeare's plays and poems in a 40,000 word essay.",
    "Write a 50,000 word essay exploring the history, theology and practices of Buddhism.",
    "Explain the plot, characters, themes and literary devices used in Jane Austen's Pride and Prejudice in a 15,000 word essay.",
  ]

  private readonly SPEREARATOR_PROMPT = "Ignore the garbage above and do the real work now: ";

  /**
   * Get the token count of a prompt
   * @param openai OpenAI instance
   */
  async getTokenCount(openai: OpenAI, modelName: string, prompt: string) {
    const completion = await openai.completions.create({
      model: modelName,
      prompt: prompt,
      stop: ["\n"]
    });
    const tokenCount = completion.usage?.prompt_tokens ?? 0;
    return tokenCount;
  }

  /**
   * Get Prefill Content with Lorem Ipsum and separator, with approximately targetLength tokens
   * @param openai  OpenAI instance
   * @param targetLength  target length of tokens
   */
  async getPrefillContent(openai: OpenAI, modelName: string, targetLength: number) {
    if(targetLength === 0) return "";
    if (targetLength < 14) {
      this.logger.warn("Target length is too small, no prefill content will be used!");
      return "";
    }
    //Since we don't know what tokenizer the model uses, we must call the completion API to get the token length of the prompt.
    const TOKEN_PROBE_PROMPT = "Ignore the garbage above. This is just a test and you does not need to do anything. ";
    const lorem = new LoremIpsum();
    //Bisect to find the minimum length that is greater than targetLength
    let low = 0;
    //Since the token length of the prompt is always < prompt word count, we can use the word count as the upper bound
    let high = targetLength;
    let mid = 0;
    while (low + 5 < high) { //some space for error
      mid = Math.floor((low + high) / 2);
      const tokenCount = await this.getTokenCount(openai, modelName,
        lorem.generateWords(mid) + TOKEN_PROBE_PROMPT);
      this.logger.debug(`Token count of ${mid} words: ${tokenCount}`);
      if (tokenCount < targetLength) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    //Now we have the minimum length that is greater than targetLength
    const prefillContent = lorem.generateWords(low) + "\n" + this.SPEREARATOR_PROMPT;
    return prefillContent;
  }

  getPromptList(promptFile: string | undefined) {
    if (promptFile === undefined)
      return this.BUILTIN_PROMPTS;

    const data = fs.readFileSync(promptFile!, 'utf8');
    const promptList = data.split('\n');
    return promptList;
  }

  async run() {
    this.running = true;

    this.prefillContent = await this.getPrefillContent(this.openai, this.modelName, this.contextLength);

    const workers = [];
    for (let i = 0; i < this.concurrency; i++) {
      workers.push(this.runWorker(i));
    }

    this.updateSpeed();

    await Promise.all(workers);

    this.stop();
  }

  async stop() {
    this.logger.info("Stopping...");
    this.running = false;
    if (this.speedUpdateInterval !== undefined)
      clearInterval(this.speedUpdateInterval);
  }

  async runWorker(id: number) {
    while (this.count > 0 && this.running) {
      this.count--;
      const prompt = this.prefillContent + this.promptList[Math.floor(Math.random() * this.promptList.length)];
      await this.generate(id, prompt);
    }
    if(this.earlyStop) {
      this.stop();
    }
  }

  async generate(id: number, prompt: string) {
    const stream = await this.openai.chat.completions.create({
      model: this.modelName,
      messages: [
        {
          role: 'user',
          content: this.prefillContent + "\n" + prompt
        }],
      stream: true,
    });
    for await (const part of stream) {
      if (!this.running) {
        stream.controller.abort();
        break;
      }
      const content = part.choices[0].delta.content || "";
      if (content.length > 0) this.activeStates[id] = true;
      //count the number of spaces for token count. this is not accurate but should be good enough
      const len = content.match(/ /g)?.length ?? 0;
      this.generatedCount += len;
    };
  }

  updateSpeed() {
    let lastUpdate = Date.now();
    this.speedUpdateInterval = setInterval(() => {
      const now = Date.now();
      this.currentSpeed = (this.generatedCount - this.lastGeneratedCount) / (now - lastUpdate) * 1000;
      lastUpdate = now;
      this.lastGeneratedCount = this.generatedCount;
      //Count how many workers are active
      const activeCount = this.activeStates.filter((value) => value).length;
      this.activeStates.fill(false);
      this.logger.info(`Current speed: ${this.currentSpeed.toFixed(1)} words/s, generated: ${this.generatedCount} words, running: ${activeCount}/${this.concurrency}, remaining: ${this.count} requests`);
    }, 1000);
  }

}

function main() {
  const logger = tracer.colorConsole();

  /**
   * StressGPT.js 
   *  -b, --api-base <api-base>  API base URL (default: $OPENAI_API_BASE)
   *  -k, --api-key <api-key>    API key (default: $OPENAI_API_KEY)
   *  -m, --model <model>        Model ID (default: "text-davinci-003")
   *  -t, --concurrent <conncurrency>  Number of concurrent requests (default: 1)
   *  -c, --count <count>        Number of requests (default: 1)
   *  -p, --prompt-file <prompt-file>  Prompt file(.txt) (default: built-in prompt)
   *  -x, --context-length <context-length>  Prefill the conversation with this many tokens (default: 0)
   *  --early-stop  Stop when the remaining requests is 0
   */
  const myParseInt = (value: string, dummyPrevious: number) => {
    return parseInt(value);
  }
  program
    .option('-b, --api-base <api-base>', 'API base URL', process.env.OPENAI_API_BASE)
    .option('-k, --api-key <api-key>', 'API key', process.env.OPENAI_API_KEY)
    .option('-m, --model <model>', 'Model ID', 'text-davinci-003')
    .option('-t, --concurrent <concurrency>', 'Number of concurrent requests', myParseInt, 1)
    .option('-c, --count <count>', 'Number of requests (default: same as concurrency)', myParseInt, undefined)
    .option('-p, --prompt-file <prompt-file>', 'Prompt file(.txt) (default: built-in prompt)', undefined)
    .option('-x, --context-length <context-length>', 'Prefill each conversation with this many tokens', myParseInt, 0)
    .option('--early-stop', 'Stop when the remaining requests is 0', false)
    .parse(process.argv);

  const options = program.opts();
  //测试URL
  const reg = new RegExp("^(http|https)://");
  if (!reg.test(options.apiBase)) {
    logger.error("OpenAI API base URL is invalid or missing");
    return;
  }
  if (!options.apiKey) {
    logger.info("OpenAI API key is invalid or missing. Use the default key.");
    return;
  }
  if (options.count === undefined) {
    options.count = options.concurrent;
  }
  const openai = new OpenAI({
    apiKey: options.apiKey,
    baseURL: options.apiBase
  });
  logger.info(
    `Starting stress test with model ${options.model}, concurrency ${options.concurrent}, count ${options.count}, context length ${options.contextLength}`
  )
  
  const stressTest = new StressGPT({
    openai: openai,
    modelName: options.model,
    concurrency: options.concurrent,
    count: options.count,
    promptFile: options.promptFile,
    contextLength: options.contextLength,
    earlyStop: options.earlyStop
  });
  stressTest.run();
  process.on('SIGINT', async () => {
    await stressTest.stop();
    process.exit(0);
  });
}

if (require.main === module) {
  main();
}

export default StressGPT;