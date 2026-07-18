import json
import os

def grade_results():
    results_path = "/media/toor/WD_BLACK1/Data Utama/Coding/Antigravity/Playground/Jules-Companion/evals/results.json"
    with open(results_path, 'r') as f:
        results = json.load(f)

    markdown = "# Evals Grading Report\n\n"
    markdown += "This report grades the performance of the `jules-companion` skill against baseline runs.\n\n"
    
    total_assertions = 0
    baseline_passed_count = 0
    skill_passed_count = 0
    
    for r in results:
        markdown += f"## Test Case: {r['id']}\n"
        markdown += f"**Prompt**: `{r['prompt']}`\n\n"
        
        markdown += "### Baseline Run\n"
        markdown += f"*Response*: *\"{r['baseline']['response']}\"*\n"
        for ass in r['baseline']['assertions']:
            total_assertions += 1
            status = "✅ PASS" if ass['passed'] else "❌ FAIL"
            if ass['passed']:
                baseline_passed_count += 1
            markdown += f"- [{status}] {ass['assertion']}\n"
        
        markdown += "\n### With Skill Active Run\n"
        markdown += f"*Response*: *\"{r['with_skill']['response']}\"*\n"
        for ass in r['with_skill']['assertions']:
            status = "✅ PASS" if ass['passed'] else "❌ FAIL"
            if ass['passed']:
                skill_passed_count += 1
            markdown += f"- [{status}] {ass['assertion']}\n"
        markdown += "\n---\n\n"
        
    baseline_score = (baseline_passed_count / total_assertions) * 100
    skill_score = (skill_passed_count / total_assertions) * 100
    
    summary = (
        f"## Summary\n"
        f"- **Total Assertions Checked**: {total_assertions}\n"
        f"- **Baseline Score**: {baseline_score:.1f}% ({baseline_passed_count}/{total_assertions} passed)\n"
        f"- **With Skill Active Score**: {skill_score:.1f}% ({skill_passed_count}/{total_assertions} passed)\n"
        f"- **Performance Gain**: +{skill_score - baseline_score:.1f}%\n"
    )
    
    markdown = markdown + summary
    
    grader_path = "/media/toor/WD_BLACK1/Data Utama/Coding/Antigravity/Playground/Jules-Companion/evals/grader.md"
    with open(grader_path, 'w') as f:
        f.write(markdown)
    
    # Save benchmark metrics to a json file
    benchmark = {
        "total_test_cases": len(results),
        "total_assertions": total_assertions,
        "baseline_passed": baseline_passed_count,
        "skill_passed": skill_passed_count,
        "baseline_score_pct": baseline_score,
        "skill_score_pct": skill_score,
        "gain_pct": skill_score - baseline_score
    }
    
    benchmark_path = "/media/toor/WD_BLACK1/Data Utama/Coding/Antigravity/Playground/evals/benchmark.json"
    os.makedirs(os.path.dirname(benchmark_path), exist_ok=True)
    with open(benchmark_path, 'w') as f:
        json.dump(benchmark, f, indent=2)

    print(f"Grading completed. Report written to {grader_path}")

if __name__ == "__main__":
    grade_results()
