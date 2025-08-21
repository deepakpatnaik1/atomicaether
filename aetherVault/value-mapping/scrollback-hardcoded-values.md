# MessageScrollback Hardcoded Values Mapping

## Theme Values (Visual Styling)

| Hardcoded Value | Externalization String | Semantic Meaning & Impact of Change |
|-----------------|------------------------|--------------------------------------|
| `#e0e0e0` | `scrollback.text.defaultColor` | Default text color for scrollback container. Changing affects overall text readability |
| `#DFD0B8` | `scrollback.message.textColor` | Message body text color. Changing affects message content readability and warmth |
| `#ef4444` | `scrollback.roleLabel.user.textColor` | Boss/User role label text color. Changing affects user message identification |
| `#f97316` | `scrollback.roleLabel.assistant.textColor` | Samara/Assistant role label text color. Changing affects assistant message identification |
| `rgba(239, 68, 68, 0.2)` | `scrollback.roleLabel.user.background` | Boss role label background. Changing affects visual hierarchy of user messages |
| `rgba(249, 115, 22, 0.2)` | `scrollback.roleLabel.assistant.background` | Samara role label background. Changing affects visual hierarchy of assistant messages |
| `rgba(239, 68, 68, 0.3)` | `scrollback.roleLabel.user.borderColor` | Boss role label border. Changing affects label definition and prominence |
| `rgba(249, 115, 22, 0.3)` | `scrollback.roleLabel.assistant.borderColor` | Samara role label border. Changing affects label definition and prominence |
| `'Lexend', -apple-system, ...` | `scrollback.typography.fontFamily` | Font stack for entire scrollback. Changing affects readability and character |
| `13px` | `scrollback.typography.fontSize` | Base font size for scrollback. Changing affects overall text scale and density |
| `11px` | `scrollback.roleLabel.fontSize` | Role label font size. Changing affects label prominence vs message content |
| `600` | `scrollback.roleLabel.fontWeight` | Role label font weight. Changing affects label emphasis (400=normal, 700=bold) |
| `600` (message content) | `scrollback.message.boldWeight` | Bold text weight in messages. Changing affects emphasis strength |
| `4px` | `scrollback.roleLabel.borderRadius` | Role label corner rounding. Changing affects visual softness (0=sharp, 8px=very rounded) |
| `1.5` | `scrollback.typography.lineHeight` | Line spacing multiplier. Changing affects vertical text density (1.2=tight, 1.8=loose) |
| `0.3s ease` | `scrollback.animation.fadeIn.duration` | Message fade-in animation speed. Changing affects perceived responsiveness |
| `10px` (translateY) | `scrollback.animation.fadeIn.distance` | Message slide-up distance on appear. Changing affects animation subtlety |

## Structural Values (Layout & Spacing)

| Hardcoded Value | Externalization String | Semantic Meaning & Impact of Change |
|-----------------|------------------------|--------------------------------------|
| `calc(100vh - 114px)` | `scrollback.container.height` | Total scrollback height. 114px accounts for input bar + gap. Changing affects available message space |
| `650px` | `scrollback.container.defaultWidth` | Mobile/small screen width. Changing affects horizontal content space on mobile |
| `800px` | `scrollback.container.largeWidth` | Desktop screen width. Changing affects horizontal content space on desktop |
| `calc(100vw - 40px)` | `scrollback.container.maxWidth` | Maximum width constraint. 40px prevents edge touching. Changing affects edge padding |
| `705px` | `scrollback.breakpoints.desktop` | Viewport width for desktop mode. Changing affects when layout switches |
| `32px` | `scrollback.message.spacing` | Vertical gap between messages. Changing affects conversation density |
| `20px 0` | `scrollback.messages.paddingVertical` | Top/bottom padding of message area. Changing affects content edge spacing |
| `16px` | `scrollback.messages.paddingRight` | Right padding of message area. Changing affects right edge alignment |
| `20px` | `scrollback.messages.paddingBottom` | Bottom padding of message area. Changing affects last message position |
| `3px` | `scrollback.message.paddingRight` | Individual message right padding. Changing affects message border position |
| `10px` | `scrollback.roleLabel.marginBottom` | Space between role label and message. Changing affects label-to-content relationship |
| `19px` | `scrollback.messageContent.marginLeft` | Message content left indent. Changing affects text alignment with role label |
| `2px 8px` | `scrollback.roleLabel.padding` | Internal role label padding. Changing affects label size and text spacing |
| `12px` | `scrollback.paragraph.marginBottom` | Space between paragraphs. Changing affects paragraph separation |
| `8px` | `scrollback.bullet.marginRight` | Space between bullet and text. Changing affects bullet list readability |
| `8px` | `scrollback.bullet.paddingLeft` | Bullet item left indent. Changing affects list hierarchy visibility |

## Semantic Values (Content & Behavior)

| Hardcoded Value | Externalization String | Semantic Meaning & Impact of Change |
|-----------------|------------------------|--------------------------------------|
| `'Boss'` | `scrollback.roleLabel.userText` | Display name for user messages. Changing affects user identification |
| `'Samara'` | `scrollback.roleLabel.assistantText` | Display name for assistant messages. Changing affects assistant personality |
| `'user'` | `scrollback.roles.user` | User role identifier. Changing would break role detection logic |
| `'assistant'` | `scrollback.roles.assistant` | Assistant role identifier. Changing would break role detection logic |
| `'•'` | `scrollback.bullet.character` | Bullet point character. Changing affects list style (→, ▸, ◆ as alternatives) |
| `flex` | `scrollback.layout.displayType` | Container layout method. Changing to grid would require layout restructure |
| `border-box` | `scrollback.boxSizing` | CSS box model. Changing to content-box would affect all dimension calculations |
| `none` (scrollbar) | `scrollback.scrollbar.display` | Scrollbar visibility. Changing to 'auto' shows system scrollbar |

## Color System Patterns

| Pattern | Externalization Approach | Impact |
|---------|-------------------------|---------|
| User colors (reds) | Group under `scrollback.roleLabel.user.*` | Maintains consistent user identification |
| Assistant colors (oranges) | Group under `scrollback.roleLabel.assistant.*` | Maintains consistent assistant identification |
| Text colors (warm whites) | Group under `scrollback.text.*` | Maintains readability theme |
| Opacity values | Keep with their base colors | Maintains visual hierarchy relationships |