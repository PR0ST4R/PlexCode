/**
 * PlexCode — Starter Templates
 */

export const TEMPLATES = {
  html: (name) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${name || 'My Page'}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0d0d0f;
      color: #f0f0f2;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    h1 { font-size: 2rem; color: #22c55e; }
  </style>
</head>
<body>
  <h1>Hello, World!</h1>
  <script>
    console.log('${name || 'Page'} loaded!');
  <\/script>
</body>
</html>`,

  css: (name) => `/* ${name || 'Styles'} */

:root {
  --color-primary: #22c55e;
  --color-bg: #0d0d0f;
  --color-text: #f0f0f2;
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-sans);
  background: var(--color-bg);
  color: var(--color-text);
  line-height: 1.6;
}

.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 20px;
}`,

  javascript: (name) => `// ${name || 'Script'}

'use strict';

/**
 * Main entry point
 */
function main() {
  console.log('${name || 'Script'} running!');
}

document.addEventListener('DOMContentLoaded', main);`,

  typescript: (name) => `// ${name || 'Script'}.ts

interface Config {
  name: string;
  version: string;
}

const config: Config = {
  name: '${name || 'App'}',
  version: '1.0.0',
};

function greet(user: string): string {
  return \`Hello, \${user}! Welcome to \${config.name}\`;
}

console.log(greet('World'));`,

  json: (name) => `{
  "name": "${name || 'project'}",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "keywords": [],
  "author": "",
  "license": "MIT"
}`,

  markdown: (name) => `# ${name || 'Document'}

## Introduction

Write your content here.

## Features

- Feature one
- Feature two
- Feature three

## Usage

\`\`\`bash
npm install
npm start
\`\`\`

## License

MIT`,

  python: (name) => `# ${name || 'script'}.py


def main():
    """Main entry point."""
    print("Hello from ${name || 'Python'}!")


if __name__ == "__main__":
    main()`,

  java: (name) => {
    const cls = (name || 'Main').replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9]/g, '');
    return `public class ${cls} {

    public static void main(String[] args) {
        System.out.println("Hello from ${cls}!");
    }
}`;
  },

  cpp: (name) => `// ${name || 'main'}.cpp
#include <iostream>
#include <string>

int main() {
    std::string message = "Hello from ${name || 'C++'}!";
    std::cout << message << std::endl;
    return 0;
}`,

  php: (name) => `<?php
// ${name || 'script'}.php

declare(strict_types=1);

function main(): void {
    echo "Hello from ${name || 'PHP'}!" . PHP_EOL;
}

main();`,

  plaintext: () => '',
  other: () => '',
};

/**
 * Get starter template content for a language.
 * @param {string} lang
 * @param {string} filename
 * @returns {string}
 */
export function getTemplate(lang, filename) {
  const fn = TEMPLATES[lang] || TEMPLATES.plaintext;
  return fn(filename);
}
