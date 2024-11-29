https://developer.chrome.com/docs/extensions/ai/prompt-api#model_capabilities

Instantiation
Now we can instantiate our model object and generate chat completions:

import { ChatOllama } from "@langchain/ollama";

const llm = new ChatOllama({
model: "llama3",
temperature: 0,
maxRetries: 2,
// other params...
});

Invocation
const aiMsg = await llm.invoke([
[
"system",
"You are a helpful assistant that translates English to French. Translate the user sentence.",
],
["human", "I love programming."],
]);
aiMsg;

AIMessage {
"content": "Je adore le programmation.\n\n(Note: \"programmation\" is the feminine form of the noun in French, but if you want to use the masculine form, it would be \"le programme\" instead.)",
"additional_kwargs": {},
"response_metadata": {
"model": "llama3",
"created_at": "2024-08-01T16:59:17.359302Z",
"done_reason": "stop",
"done": true,
"total_duration": 6399311167,
"load_duration": 5575776417,
"prompt_eval_count": 35,
"prompt_eval_duration": 110053000,
"eval_count": 43,
"eval_duration": 711744000
},
"tool_calls": [],
"invalid_tool_calls": [],
"usage_metadata": {
"input_tokens": 35,
"output_tokens": 43,
"total_tokens": 78
}
}

console.log(aiMsg.content);

Je adore le programmation.

(Note: "programmation" is the feminine form of the noun in French, but if you want to use the masculine form, it would be "le programme" instead.)

Chaining
We can chain our model with a prompt template like so:

import { ChatPromptTemplate } from "@langchain/core/prompts";

const prompt = ChatPromptTemplate.fromMessages([
[
"system",
"You are a helpful assistant that translates {input_language} to {output_language}.",
],
["human", "{input}"],
]);

const chain = prompt.pipe(llm);
await chain.invoke({
input_language: "English",
output_language: "German",
input: "I love programming.",
});

AIMessage {
"content": "Ich liebe Programmieren!\n\n(Note: \"Ich liebe\" means \"I love\", \"Programmieren\" is the verb for \"programming\")",
"additional_kwargs": {},
"response_metadata": {
"model": "llama3",
"created_at": "2024-08-01T16:59:18.088423Z",
"done_reason": "stop",
"done": true,
"total_duration": 585146125,
"load_duration": 27557166,
"prompt_eval_count": 30,
"prompt_eval_duration": 74241000,
"eval_count": 29,
"eval_duration": 481195000
},
"tool_calls": [],
"invalid_tool_calls": [],
"usage_metadata": {
"input_tokens": 30,
"output_tokens": 29,
"total_tokens": 59
}
}

Tools
Ollama now offers support for native tool calling for a subset of their available models. The example below demonstrates how you can invoke a tool from an Ollama model.

import { tool } from "@langchain/core/tools";
import { ChatOllama } from "@langchain/ollama";
import { z } from "zod";

const weatherTool = tool((\_) => "Da weather is weatherin", {
name: "get_current_weather",
description: "Get the current weather in a given location",
schema: z.object({
location: z.string().describe("The city and state, e.g. San Francisco, CA"),
}),
});

// Define the model
const llmForTool = new ChatOllama({
model: "llama3-groq-tool-use",
});

// Bind the tool to the model
const llmWithTools = llmForTool.bindTools([weatherTool]);

const resultFromTool = await llmWithTools.invoke(
"What's the weather like today in San Francisco? Ensure you use the 'get_current_weather' tool."
);

console.log(resultFromTool);

AIMessage {
"content": "",
"additional_kwargs": {},
"response_metadata": {
"model": "llama3-groq-tool-use",
"created_at": "2024-08-01T18:43:13.2181Z",
"done_reason": "stop",
"done": true,
"total_duration": 2311023875,
"load_duration": 1560670292,
"prompt_eval_count": 177,
"prompt_eval_duration": 263603000,
"eval_count": 30,
"eval_duration": 485582000
},
"tool_calls": [
{
"name": "get_current_weather",
"args": {
"location": "San Francisco, CA"
},
"id": "c7a9d590-99ad-42af-9996-41b90efcf827",
"type": "tool_call"
}
],
"invalid_tool_calls": [],
"usage_metadata": {
"input_tokens": 177,
"output_tokens": 30,
"total_tokens": 207
}
}

.withStructuredOutput
For models that support tool calling, you can also call .withStructuredOutput() to get a structured output from the tool.

import { ChatOllama } from "@langchain/ollama";
import { z } from "zod";

// Define the model
const llmForWSO = new ChatOllama({
model: "llama3-groq-tool-use",
});

// Define the tool schema you'd like the model to use.
const schemaForWSO = z.object({
location: z.string().describe("The city and state, e.g. San Francisco, CA"),
});

// Pass the schema to the withStructuredOutput method to bind it to the model.
const llmWithStructuredOutput = llmForWSO.withStructuredOutput(schemaForWSO, {
name: "get_current_weather",
});

const resultFromWSO = await llmWithStructuredOutput.invoke(
"What's the weather like today in San Francisco? Ensure you use the 'get_current_weather' tool."
);
console.log(resultFromWSO);

{ location: 'San Francisco, CA' }

JSON mode
Ollama also supports a JSON mode for all chat models that coerces model outputs to only return JSON. Here’s an example of how this can be useful for extraction:

import { ChatOllama } from "@langchain/ollama";
import { ChatPromptTemplate } from "@langchain/core/prompts";

const promptForJsonMode = ChatPromptTemplate.fromMessages([
[
"system",
`You are an expert translator. Format all responses as JSON objects with two keys: "original" and "translated".`,
],
["human", `Translate "{input}" into {language}.`],
]);

const llmJsonMode = new ChatOllama({
baseUrl: "http://localhost:11434", // Default value
model: "llama3",
format: "json",
});

const chainForJsonMode = promptForJsonMode.pipe(llmJsonMode);

const resultFromJsonMode = await chainForJsonMode.invoke({
input: "I love programming",
language: "German",
});

console.log(resultFromJsonMode);

AIMessage {
"content": "{\n\"original\": \"I love programming\",\n\"translated\": \"Ich liebe Programmierung\"\n}",
"additional_kwargs": {},
"response_metadata": {
"model": "llama3",
"created_at": "2024-08-01T17:24:54.35568Z",
"done_reason": "stop",
"done": true,
"total_duration": 1754811583,
"load_duration": 1297200208,
"prompt_eval_count": 47,
"prompt_eval_duration": 128532000,
"eval_count": 20,
"eval_duration": 318519000
},
"tool_calls": [],
"invalid_tool_calls": [],
"usage_metadata": {
"input_tokens": 47,
"output_tokens": 20,
"total_tokens": 67
}
}

Multimodal models
Ollama supports open source multimodal models like LLaVA in versions 0.1.15 and up. You can pass images as part of a message’s content field to multimodal-capable models like this:

import { ChatOllama } from "@langchain/ollama";
import { HumanMessage } from "@langchain/core/messages";
import \* as fs from "node:fs/promises";

const imageData = await fs.readFile("../../../../../examples/hotdog.jpg");
const llmForMultiModal = new ChatOllama({
model: "llava",
baseUrl: "http://127.0.0.1:11434",
});
const multiModalRes = await llmForMultiModal.invoke([
new HumanMessage({
content: [
{
type: "text",
text: "What is in this image?",
},
{
type: "image_url",
image_url: `data:image/jpeg;base64,${imageData.toString("base64")}`,
},
],
}),
]);
console.log(multiModalRes);

AIMessage {
"content": " The image shows a hot dog in a bun, which appears to be a footlong. It has been cooked or grilled to the point where it's browned and possibly has some blackened edges, indicating it might be slightly overcooked. Accompanying the hot dog is a bun that looks toasted as well. There are visible char marks on both the hot dog and the bun, suggesting they have been cooked directly over a source of heat, such as a grill or broiler. The background is white, which puts the focus entirely on the hot dog and its bun. ",
"additional_kwargs": {},
"response_metadata": {
"model": "llava",
"created_at": "2024-08-01T17:25:02.169957Z",
"done_reason": "stop",
"done": true,
"total_duration": 5700249458,
"load_duration": 2543040666,
"prompt_eval_count": 1,
"prompt_eval_duration": 1032591000,
"eval_count": 127,
"eval_duration": 2114201000
},
"tool_calls": [],
"invalid_tool_calls": [],
"usage_metadata": {
"input_tokens": 1,
"output_tokens": 127,
"total_tokens": 128
}
}
