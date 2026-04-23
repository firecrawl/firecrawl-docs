# Firecrawl Docs 🔥

Welcome to the Firecrawl documentation repository! This repo contains the source files for [docs.firecrawl.dev](https://docs.firecrawl.dev), powered by [Mintlify](https://mintlify.com/).

## About Firecrawl

Firecrawl is an API platform that helps AI systems search, scrape, and interact with the web. With Firecrawl, you can power your AI applications with clean, structured web data, making it easier to create powerful and accurate language models.

## Getting Started

To get started with the Firecrawl documentation, follow the steps below:

### Prerequisites

- Node.js LTS (version 19 or higher). **Node 25+ is not supported** by the Mintlify CLI — it fails with `TypeError: localStorage.getItem is not a function` (see [mintlify/starter#116](https://github.com/mintlify/starter/issues/116)). If you're on Node 25+, pin an LTS for this repo with a version manager such as [mise](https://mise.jdx.dev/) or [nvm](https://github.com/nvm-sh/nvm):

  ```bash
  mise use node@24
  # or
  nvm install 24 && nvm use 24
  ```

### Installation

1. Install the Mintlify CLI globally:

   ```bash
   npm install -g mint
   ```

   Or with your preferred package manager (`bun add -g mint`, `yarn global add mint`, `pnpm add -g mint`).

2. Clone this repository and navigate to the directory:

   ```bash
   git clone https://github.com/firecrawl/firecrawl-docs.git
   cd firecrawl-docs
   ```

3. Start the Mintlify development server:

   ```bash
   mint dev
   ```

   > Note: the CLI was renamed from `mintlify` to `mint`. The old `mintlify dev` command is deprecated.

4. Open your web browser and visit [http://localhost:3000](http://localhost:3000) to see a local preview of the documentation.

## Contributing

We welcome contributions to improve the Firecrawl documentation! If you find any issues or want to suggest enhancements, please open an issue or submit a pull request to this repository.

When contributing, please follow these guidelines:

- Keep the documentation clear, concise, and easy to understand.
- Use proper formatting and adhere to the existing document structure.
- Test your changes locally before submitting a pull request.

## Contact

If you have any questions or need further assistance, please reach out to us at [help@firecrawl.dev](mailto:help@firecrawl.dev).

Happy building with Firecrawl! 🔥
