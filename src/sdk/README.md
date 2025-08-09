# Generative AI SDK

This folder contains the API interface and integration to a different LLM Providers and Models.  The SDK is designed to generate a response from the LLM based on prompt or a set of chat message.

The goal of this SDK is to avoid any external AI Framework or LLM client dependencies and integrate directly with the REST API of each provider.

## Interfaces

The interfaces folder contains the TypeScript interface definition of the a common API for multiple LLM Providers

## Providers

The providers folder contains the implementation of each provider that follows the TypeScript interfaces.   For each provider below it uses the associated REST API to generate a response from the LLM:

- [Ollama](https://raw.githubusercontent.com/ollama/ollama/refs/heads/main/docs/api.md)

## Factory

Implementation of the factory interface defined by the TypeScript interface.   