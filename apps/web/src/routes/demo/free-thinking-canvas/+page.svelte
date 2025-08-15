<script lang="ts">
  // Free-thinking canvas - experiment without rules!
  let experimentText = $state('Try something here...');
  let results = $state('Results will appear here');
  
  function runExperiment() {
    results = `Experiment ran at ${new Date().toLocaleTimeString()}`;
  }
</script>

<nav>
  <a href="/demo">← Back to Demo Gallery</a>
</nav>

<h1>🧪 Free-Thinking Canvas</h1>

<p>This is your sandbox to experiment without worrying about the Essential Boss Rules. Go wild!</p>

<div class="canvas">
  <div class="experiment-area">
    <h2>Experiment Zone</h2>
    
    <textarea 
      bind:value={experimentText} 
      placeholder="Try something here..."
      rows="8"
    ></textarea>
    
    <button on:click={runExperiment}>
      Run Experiment
    </button>
    
    <div class="results">
      <h3>Results:</h3>
      <pre>{results}</pre>
    </div>
  </div>
  
  <div class="notes-area">
    <h2>Notes & Ideas</h2>
    <ul>
      <li>Test native Svelte features</li>
      <li>Try CSS experiments</li>
      <li>Mock up UI concepts</li>
      <li>Explore web APIs</li>
      <li>Prototype interactions</li>
    </ul>
  </div>
</div>

<style>
  .canvas {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 30px;
    margin: 30px 0;
  }
  
  .experiment-area, .notes-area {
    padding: 20px;
    border: 2px dashed #ccc;
    border-radius: 12px;
    background: #fafafa;
  }
  
  .experiment-area h2, .notes-area h2 {
    margin-top: 0;
    color: #333;
  }
  
  textarea {
    width: 100%;
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-family: monospace;
    font-size: 14px;
    margin-bottom: 15px;
    resize: vertical;
  }
  
  button {
    background: #007acc;
    color: white;
    border: none;
    padding: 12px 20px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
    margin-bottom: 20px;
  }
  
  button:hover {
    background: #005a9f;
  }
  
  .results {
    background: white;
    padding: 15px;
    border-radius: 6px;
    border: 1px solid #ddd;
  }
  
  .results h3 {
    margin-top: 0;
    margin-bottom: 10px;
    color: #555;
  }
  
  pre {
    margin: 0;
    font-family: monospace;
    color: #333;
    white-space: pre-wrap;
  }
  
  nav {
    margin-bottom: 20px;
  }
  
  nav a {
    text-decoration: none;
    color: #007acc;
  }
  
  .notes-area ul {
    list-style-type: none;
    padding: 0;
  }
  
  .notes-area li {
    padding: 8px 0;
    border-bottom: 1px solid #eee;
    color: #666;
  }
  
  .notes-area li:before {
    content: "💡 ";
    margin-right: 8px;
  }
</style>