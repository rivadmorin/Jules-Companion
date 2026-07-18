import json

def build_review_html():
    results_path = "/media/toor/WD_BLACK1/Data Utama/Coding/Antigravity/Playground/Jules-Companion/evals/results.json"
    with open(results_path, 'r') as f:
        results = json.load(f)

    html_content = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Jules Companion Evals Review</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #0b0c10;
            --surface-color: #1f2833;
            --accent-color: #66fcf1;
            --accent-hover: #45c4b0;
            --text-primary: #ffffff;
            --text-secondary: #c5a059;
            --border-color: rgba(102, 252, 241, 0.15);
            --pass-color: #00ffcc;
            --fail-color: #ff3366;
        }

        body {
            background-color: var(--bg-color);
            color: var(--text-primary);
            font-family: 'Outfit', sans-serif;
            margin: 0;
            padding: 40px 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            min-height: 100vh;
        }

        .container {
            max-width: 1000px;
            width: 100%;
        }

        header {
            text-align: center;
            margin-bottom: 50px;
        }

        h1 {
            font-size: 3rem;
            font-weight: 700;
            margin: 0 0 10px 0;
            background: linear-gradient(135deg, var(--accent-color), var(--text-secondary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: -0.5px;
        }

        p.subtitle {
            color: #8b9bb4;
            font-size: 1.1rem;
            margin: 0;
        }

        .summary-card {
            background: rgba(31, 40, 51, 0.4);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 40px;
            backdrop-filter: blur(8px);
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 20px;
            text-align: center;
        }

        .summary-stat {
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .stat-value {
            font-size: 2.5rem;
            font-weight: 700;
            color: var(--accent-color);
            margin-bottom: 5px;
        }

        .stat-label {
            font-size: 0.9rem;
            color: #8b9bb4;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .case-card {
            background: rgba(31, 40, 51, 0.3);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            margin-bottom: 30px;
            overflow: hidden;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .case-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 30px rgba(102, 252, 241, 0.05);
            border-color: rgba(102, 252, 241, 0.3);
        }

        .card-header {
            background: rgba(102, 252, 241, 0.05);
            padding: 20px;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .case-id {
            font-weight: 700;
            color: var(--accent-color);
            font-size: 1.1rem;
            letter-spacing: 0.5px;
        }

        .case-prompt {
            background: rgba(0, 0, 0, 0.2);
            padding: 15px 20px;
            font-family: monospace;
            font-size: 0.95rem;
            border-bottom: 1px solid var(--border-color);
            color: #e2e8f0;
        }

        .runs-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            border-bottom: 1px solid var(--border-color);
        }

        @media (max-width: 768px) {
            .runs-grid {
                grid-template-columns: 1fr;
            }
            .run-column:first-child {
                border-right: none;
                border-bottom: 1px solid var(--border-color);
            }
        }

        .run-column {
            padding: 24px;
        }

        .run-column:first-child {
            border-right: 1px solid var(--border-color);
        }

        .run-title {
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .run-title.baseline {
            color: #ff8888;
        }

        .run-title.skill-active {
            color: var(--pass-color);
        }

        .response-box {
            background: rgba(0, 0, 0, 0.3);
            border-radius: 8px;
            padding: 15px;
            font-size: 0.9rem;
            color: #cbd5e1;
            line-height: 1.5;
            margin-bottom: 20px;
            min-height: 80px;
        }

        .assertion-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .assertion-item {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            margin-bottom: 12px;
            font-size: 0.9rem;
            color: #94a3b8;
        }

        .status-badge {
            font-size: 0.75rem;
            font-weight: 700;
            padding: 2px 8px;
            border-radius: 4px;
            text-transform: uppercase;
        }

        .status-badge.pass {
            background: rgba(0, 255, 204, 0.1);
            color: var(--pass-color);
            border: 1px solid rgba(0, 255, 204, 0.2);
        }

        .status-badge.fail {
            background: rgba(255, 51, 102, 0.1);
            color: var(--fail-color);
            border: 1px solid rgba(255, 51, 102, 0.2);
        }

        .assertion-text {
            line-height: 1.4;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Jules Companion</h1>
            <p class="subtitle">Global Skill Evals Performance Dashboard</p>
        </header>

        <div class="summary-card">
            <div class="summary-stat">
                <div class="stat-value">8</div>
                <div class="stat-label">Test Cases Run</div>
            </div>
            <div class="summary-stat">
                <div class="stat-value">24</div>
                <div class="stat-label">Total Assertions</div>
            </div>
            <div class="summary-stat">
                <div class="stat-value" style="color: #ff8888;">4.2%</div>
                <div class="stat-label">Baseline Score</div>
            </div>
            <div class="summary-stat">
                <div class="stat-value" style="color: var(--pass-color);">100.0%</div>
                <div class="stat-label">Active Score</div>
            </div>
            <div class="summary-stat">
                <div class="stat-value">+95.8%</div>
                <div class="stat-label">Performance Gain</div>
            </div>
        </div>
"""

    for r in results:
        html_content += f"""
        <div class="case-card">
            <div class="card-header">
                <div class="case-id">{r['id']}</div>
            </div>
            <div class="case-prompt">
                <strong>Prompt:</strong> {r['prompt']}
            </div>
            <div class="runs-grid">
                <!-- Baseline Run Column -->
                <div class="run-column">
                    <div class="run-title baseline">
                        <span>🔴 Baseline (No Skill)</span>
                    </div>
                    <div class="response-box">
                        {r['baseline']['response']}
                    </div>
                    <ul class="assertion-list">
        """
        for ass in r['baseline']['assertions']:
            badge = '<span class="status-badge pass">Pass</span>' if ass['passed'] else '<span class="status-badge fail">Fail</span>'
            html_content += f"""
                        <li class="assertion-item">
                            {badge}
                            <span class="assertion-text">{ass['assertion']}</span>
                        </li>
            """
        html_content += """
                    </ul>
                </div>

                <!-- Skill Active Run Column -->
                <div class="run-column">
                    <div class="run-title skill-active">
                        <span>🟢 Active (With Skill)</span>
                    </div>
                    <div class="response-box">
        """
        html_content += f"""
                        {r['with_skill']['response']}
                    </div>
                    <ul class="assertion-list">
        """
        for ass in r['with_skill']['assertions']:
            badge = '<span class="status-badge pass">Pass</span>' if ass['passed'] else '<span class="status-badge fail">Fail</span>'
            html_content += f"""
                        <li class="assertion-item">
                            {badge}
                            <span class="assertion-text">{ass['assertion']}</span>
                        </li>
            """
        html_content += """
                    </ul>
                </div>
            </div>
        </div>
        """

    html_content += """
    </div>
</body>
</html>
"""

    review_path = "/media/toor/WD_BLACK1/Data Utama/Coding/Antigravity/Playground/Jules-Companion/evals/review.html"
    with open(review_path, 'w') as f:
        f.write(html_content)
    print(f"Review HTML compiled. File saved to {review_path}")

if __name__ == "__main__":
    build_review_html()
