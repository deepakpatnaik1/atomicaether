# MessageScrollback Theme Migration Report

## Values to Move to rainy-night.json

### Css Dimensions
- Line 302: `1px`
  Context: `border-width: 1px;...`

### Css Numbers
- Line 92: `1`
  Context: `line = line.replace(/\*\*(.*?)\*\*/g, `<strong style="color: ${textColor}; font-...`
- Line 93: `1`
  Context: `line = line.replace(/\*(.*?)\*/g, `<em style="color: ${textColor};">$1</em>`);...`

### Css Properties
- Line 92: `color: ${textColor};`
  Context: `line = line.replace(/\*\*(.*?)\*\*/g, `<strong style="color: ${textColor}; font-...`
- Line 92: `font-weight: ${boldWeight};`
  Context: `line = line.replace(/\*\*(.*?)\*\*/g, `<strong style="color: ${textColor}; font-...`
- Line 93: `color: ${textColor};`
  Context: `line = line.replace(/\*(.*?)\*/g, `<em style="color: ${textColor};">$1</em>`);...`
- Line 101: `padding-left: ${bulletPaddingLeft};`
  Context: `processedLines.push(`<div class="bullet-item" style="padding-left: ${bulletPaddi...`
- Line 101: `color: ${bulletColor};`
  Context: `processedLines.push(`<div class="bullet-item" style="padding-left: ${bulletPaddi...`
  ...and 6 more

### Border Styles
- Line 61: `borderRadius?: string;`
  Context: `borderRadius?: string;...`
- Line 65: `borderColor?: string;`
  Context: `borderColor?: string;...`
- Line 70: `borderColor?: string;`
  Context: `borderColor?: string;...`
- Line 302: `border-width: 1px;`
  Context: `border-width: 1px;...`
- Line 303: `border-style: solid;`
  Context: `border-style: solid;...`

### Font Properties
- Line 92: `font-weight: ${boldWeight};`
  Context: `line = line.replace(/\*\*(.*?)\*\*/g, `<strong style="color: ${textColor}; font-...`
- Line 324: `font-style: italic;`
  Context: `font-style: italic;...`
- Line 336: `font-weight: bold;`
  Context: `font-weight: bold;...`

### Spacing
- Line 101: `padding-left: ${bulletPaddingLeft};`
  Context: `processedLines.push(`<div class="bullet-item" style="padding-left: ${bulletPaddi...`
- Line 101: `margin-right: ${bulletMarginRight};`
  Context: `processedLines.push(`<div class="bullet-item" style="padding-left: ${bulletPaddi...`

## Structural Values (Keep in Component)

### Css Dimensions
- 1 instances

### Css Numbers
- 20 instances

### Css Properties
- 22 instances

### Spacing
- 16 instances

### Role Labels
- 1 instances

