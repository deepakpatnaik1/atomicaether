<script lang="ts">
  import { onMount } from 'svelte';
  import { ThemePickerUI } from '$lib/components/ThemePickerUI';
  import { themeApplier } from '$lib/buses';
  
  let themeSelectedCount = 0;
  let dropdownToggledCount = 0;
  let lastSelectedTheme = '';

  onMount(() => {
    // Initialize ThemeApplier so themes actually apply visually
    themeApplier.initialize();
  });

  function handleThemeSelected(event: CustomEvent) {
    themeSelectedCount++;
    lastSelectedTheme = event.detail.theme;
    console.log('Demo: Theme selected:', event.detail.theme);
  }

  function handleDropdownToggled(event: CustomEvent) {
    dropdownToggledCount++;
    console.log('Demo: Dropdown toggled:', event.detail.open);
  }
</script>

<nav>
  <a href="/demo">← Back to Demo Gallery</a>
</nav>

<h1>BRICK-604 ThemePickerUI Demo</h1>

<p>This demo shows the ThemePickerUI component in various contexts, including how it will look in the final input bar.</p>

<div class="demo-sections">
  
  <!-- Input Bar Mockup -->
  <section class="demo-section">
    <h2>Input Bar Context (Final Integration Preview)</h2>
    <div class="input-bar-mockup">
      <div class="dropdown-mockup">
        <span class="mockup-icon">🤖</span>
        <span>GPT-4</span>
        <span class="dropdown-arrow">▼</span>
      </div>
      
      <div class="dropdown-mockup">
        <span class="mockup-icon">👤</span>
        <span>Assistant</span>
        <span class="dropdown-arrow">▼</span>
      </div>
      
      <ThemePickerUI 
        compact={true}
        on:themeSelected={handleThemeSelected}
        on:dropdownToggled={handleDropdownToggled}
      />
      
      <input 
        class="message-input" 
        placeholder="Type your message here..."
        style="background: var(--surface-background, white); color: var(--text-color, #333);"
      />
      
      <button class="send-button">Send</button>
    </div>
  </section>

  <!-- Standalone Usage -->
  <section class="demo-section">
    <h2>Standalone Usage</h2>
    <div class="standalone-demo">
      <p>Theme picker component:</p>
      <ThemePickerUI 
        compact={false}
        placeholder="Choose Theme"
        on:themeSelected={handleThemeSelected}
        on:dropdownToggled={handleDropdownToggled}
      />
    </div>
  </section>

  <!-- Event Monitoring -->
  <section class="demo-section">
    <h2>Event Monitoring</h2>
    <div class="event-monitor">
      <div class="stat">
        <strong>Themes Selected:</strong> {themeSelectedCount}
      </div>
      <div class="stat">
        <strong>Dropdown Toggles:</strong> {dropdownToggledCount}
      </div>
      <div class="stat">
        <strong>Last Selected:</strong> {lastSelectedTheme || 'None'}
      </div>
    </div>
  </section>

  <!-- Visual Theme Demo -->
  <section class="demo-section">
    <h2>Visual Theme Application</h2>
    <div class="theme-showcase" style="background: var(--app-background, #f5f5f5); color: var(--text-color, #333);">
      <p>This section uses CSS custom properties applied by the theme system:</p>
      <ul>
        <li><code>background: var(--app-background)</code></li>
        <li><code>color: var(--text-color)</code></li>
        <li><code>border-color: var(--accent-color)</code></li>
      </ul>
      <p>Select different themes above to see the colors change!</p>
    </div>
  </section>

</div>

<style>
  nav {
    margin-bottom: 20px;
  }
  
  nav a {
    text-decoration: none;
    color: #007acc;
  }
  
  .demo-sections {
    display: flex;
    flex-direction: column;
    gap: 30px;
  }
  
  .demo-section {
    padding: 20px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background: white;
  }
  
  .demo-section h2 {
    margin-top: 0;
    color: #333;
  }

  /* Input Bar Mockup */
  .input-bar-mockup {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: #f8f9fa;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  
  .dropdown-mockup {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    background: #f0f1f2;
    border: 1px solid #d0d0d0;
    border-radius: 6px;
    font-size: 13px;
    color: #333;
    min-width: 100px;
  }
  
  .mockup-icon {
    font-size: 14px;
  }
  
  .dropdown-arrow {
    font-size: 10px;
    color: #666;
    margin-left: auto;
  }
  
  .message-input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    font-size: 14px;
    outline: none;
  }
  
  .message-input:focus {
    border-color: #007acc;
  }
  
  .send-button {
    padding: 8px 16px;
    background: #007acc;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
  }
  
  .send-button:hover {
    background: #005a9f;
  }

  /* Standalone Demo */
  .standalone-demo {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }
  
  .standalone-demo p {
    margin: 10px 0 5px 0;
    font-weight: 500;
  }

  /* Event Monitor */
  .event-monitor {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
  }
  
  .stat {
    padding: 12px;
    background: #f5f5f5;
    border-radius: 6px;
    font-family: monospace;
  }

  /* Theme Showcase */
  .theme-showcase {
    padding: 20px;
    border-radius: 8px;
    border: 2px solid var(--accent-color, #ddd);
    transition: all 0.3s ease;
  }
  
  .theme-showcase code {
    background: rgba(255, 255, 255, 0.1);
    padding: 2px 6px;
    border-radius: 3px;
    font-family: 'Monaco', 'Menlo', monospace;
  }
</style>