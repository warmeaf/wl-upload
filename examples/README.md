# WL Upload Examples

This folder contains examples demonstrating how to use the WL Upload library.

## Quick Start

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Start the development server:
   ```bash
   pnpm dev
   ```

3. Open your browser and navigate to `http://localhost:3000`

## Example Features

This example demonstrates:
- Multiple file upload
- Progress tracking
- Pause/Resume functionality
- Error handling
- File status display
- TypeScript integration

## Usage

The main example is located in `src/main.ts` and demonstrates:
- Initializing WL Upload with configuration
- Handling file selection
- Managing upload lifecycle
- Progress monitoring
- Error handling

## Configuration

The example uses a mock API endpoint (`https://httpbin.org/post`) for demonstration purposes. In a real application, you would configure the `endpoint` to point to your actual upload server.

## Build

To build the example for production:
```bash
pnpm build
```