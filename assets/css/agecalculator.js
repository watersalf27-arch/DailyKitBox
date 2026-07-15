/* assets/css/style.css */
:root {
    --primary: #2563eb;
    --primary-dark: #1e40af;
    --text: #1f2937;
    --bg: #f8fafc;
    --card-bg: #ffffff;
    --border: #e2e8f0;
    --shadow: 0 10px 15px -3px rgb(0 0 0 / 0.05);
}

[data-theme="dark"] {
    --text: #f1f5f9;
    --bg: #0f172a;
    --card-bg: #1e2937;
    --border: #334155;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.6;
    transition: background 0.3s ease;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
}

.header {
    background: var(--card-bg);
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 0;
    z-index: 100;
    box-shadow: var(--shadow);
}

.nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 0;
}

.logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 1.75rem;
    font-weight: 700;
}

.logo-icon {
    font-size: 2rem;
}

.header-title h2 {
    font-size: 1.5rem;
    font-weight: 600;
}

.controls {
    display: flex;
    gap: 0.75rem;
}

.icon-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 50%;
    transition: all 0.2s;
}

.icon-btn:hover {
    background: var(--border);
}

.tabs {
    display: flex;
    gap: 0.5rem;
    margin: 2rem 0;
    flex-wrap: wrap;
    border-bottom: 1px solid var(--border);
}

.tab-btn {
    padding: 0.75rem 1.5rem;
    background: none;
    border: none;
    border-bottom: 3px solid transparent;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
}

.tab-btn.active {
    border-bottom-color: var(--primary);
    color: var(--primary);
}

.tab-content {
    display: none;
}

.tab-content.active {
    display: block;
}

.calculator-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    margin-bottom: 2rem;
}

@media (max-width: 768px) {
    .calculator-grid {
        grid-template-columns: 1fr;
    }
}

.card {
    background: var(--card-bg);
    border-radius: 20px;
    padding: 2rem;
    box-shadow: var(--shadow);
    border: 1px solid var(--border);
    transition: transform 0.3s ease;
}

.card:hover {
    transform: translateY(-4px);
}

.form-group {
    margin-bottom: 1.25rem;
}

label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
}

input, select {
    width: 100%;
    padding: 0.85rem 1rem;
    border: 2px solid var(--border);
    border-radius: 12px;
    font-size: 1rem;
    background: var(--card-bg);
    color: var(--text);
    transition: border 0.3s;
}

input:focus, select:focus {
    outline: none;
    border-color: var(--primary);
}

.btn-primary {
    background: var(--primary);
    color: white;
    border: none;
    padding: 0.85rem 2rem;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    width: 100%;
    font-size: 1.1rem;
    transition: all 0.3s;
}

.btn-primary:hover {
    background: var(--primary-dark);
    transform: translateY(-2px);
}

.btn-secondary {
    background: transparent;
    border: 2px solid var(--border);
    padding: 0.65rem 1.25rem;
    border-radius: 12px;
    cursor: pointer;
}

.results {
    font-size: 1.1rem;
    line-height: 1.8;
}

.results p {
    margin-bottom: 0.75rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--border);
}

.results p:last-child {
    border-bottom: none;
}

.result-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 2rem;
}

.info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
}

.tools-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 1.5rem;
}
.tool-card {
    background: var(--card-bg);
    padding: 1.75rem;
    border-radius: 16px;
    box-shadow: var(--shadow);
}

.modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    z-index: 1000;
    align-items: center;
    justify-content: center;
}

.modal-content {
    background: var(--card-bg);
    max-width: 500px;
    width: 90%;
    border-radius: 20px;
    padding: 2rem;
    max-height: 80vh;
    overflow-y: auto;
}
.footer {
    text-align: center;
    padding: 3rem 1rem;
    color: #64748b;
    font-size: 0.95rem;
    border-top: 1px solid var(--border);
    margin-top: 4rem;
}

/* Animations */
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

.card, .results p {
    animation: fadeIn 0.5s ease forwards;
}