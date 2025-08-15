<h1>🧱 AtomicAether Demo Gallery</h1>

<p>Welcome to the brick demo gallery. Each brick is independently tested here.</p>

<div class="gallery">
  <div class="brick-card">
    <h2>BRICK-601 ThemeRegistry</h2>
    <p>Discovers and loads theme JSON files using DiscoveryBus</p>
    <a href="/demo/brick-601" class="demo-link">View Demo →</a>
  </div>

  <div class="brick-card">
    <h2>BRICK-602 ThemeSelector</h2>
    <p>Manages theme selection state with StateBus and EventBus integration</p>
    <a href="/demo/brick-602" class="demo-link">View Demo →</a>
  </div>

  <div class="brick-card">
    <h2>BRICK-603 ThemeApplier</h2>
    <p>Applies theme properties as CSS custom properties on document root</p>
    <a href="/demo/brick-603" class="demo-link">View Demo →</a>
  </div>
</div>

<nav>
  <a href="/">← Back to Main App</a>
</nav>

<style>
  .gallery {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    margin: 20px 0;
  }
  
  .brick-card {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 20px;
    background: #f9f9f9;
  }
  
  .brick-card h2 {
    margin: 0 0 10px 0;
    color: #333;
  }
  
  .brick-card p {
    color: #666;
    margin-bottom: 15px;
  }
  
  .demo-link {
    display: inline-block;
    background: #007acc;
    color: white;
    padding: 10px 15px;
    text-decoration: none;
    border-radius: 4px;
    font-weight: bold;
  }
  
  .demo-link:hover {
    background: #005a9f;
  }
  
  nav {
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px solid #eee;
  }
  
  nav a {
    text-decoration: none;
    color: #007acc;
  }
</style>