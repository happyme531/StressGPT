#!/usr/bin/env node
import OpenAI from 'openai';
declare class StressGPT {
    private openai;
    private modelName;
    private concurrency;
    private promptList;
    private contextLength;
    private prefillContent;
    private lastGeneratedCount;
    private speedUpdateInterval;
    private activeStates;
    private earlyStop;
    currentSpeed: number;
    running: boolean;
    count: number;
    generatedCount: number;
    constructor(options: {
        openai: OpenAI;
        modelName: string;
        concurrency: number;
        count: number;
        promptFile: string | undefined;
        contextLength: number;
        earlyStop: boolean;
    });
    private readonly logger;
    private readonly BUILTIN_PROMPTS;
    private readonly SPEREARATOR_PROMPT;
    /**
     * Get the token count of a prompt
     * @param openai OpenAI instance
     */
    getTokenCount(openai: OpenAI, modelName: string, prompt: string): Promise<number>;
    /**
     * Get Prefill Content with Lorem Ipsum and separator, with approximately targetLength tokens
     * @param openai  OpenAI instance
     * @param targetLength  target length of tokens
     */
    getPrefillContent(openai: OpenAI, modelName: string, targetLength: number): Promise<string>;
    getPromptList(promptFile: string | undefined): string[];
    run(): Promise<void>;
    stop(): Promise<void>;
    runWorker(id: number): Promise<void>;
    generate(id: number, prompt: string): Promise<void>;
    updateSpeed(): void;
}
export default StressGPT;
