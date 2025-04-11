# Page Blur Pro

A Chrome extension that allows you to blur sensitive content on web pages.

## Features

- Multiple blur modes:
  - Text blur: Select and blur text content
  - Area blur: Draw areas to blur
  - Element blur: Click to blur entire elements
- Adjustable blur intensity
- Persistent blur settings
- Real-time blur application and removal
- Unblur functionality for individual elements or all at once

## Installation

1. Clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

## Usage

1. Click the extension icon to activate
2. Select a blur mode:
   - Text blur: Select text to blur
   - Area blur: Click and drag to create blur areas
   - Element blur: Click elements to blur them
3. Adjust blur intensity using the slider
4. Use the popup to manage blurred elements:
   - View all blurred elements
   - Unblur individual elements
   - Unblur all elements at once

## Development

The project structure is organized as follows:

```
screenblur/
├── manifest.json
├── README.md
├── src/
│   ├── background/
│   │   └── background.js
│   ├── content/
│   │   ├── content.js
│   │   └── content.css
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
│   └── utils/
│       └── constants.js
└── assets/
    └── icon.png
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT 