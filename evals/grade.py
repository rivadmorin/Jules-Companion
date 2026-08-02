"""
Grading module for Jules Companion evaluations.
This script reads the simulated test results, calculates performance scores
based on passed assertions, and generates both a Markdown report and a JSON benchmark summary.
"""
import json
import os

def grade_results():
    """
    Evaluates the simulation results and generates grading artifacts.

    This function processes 'results.json' produced by run_tests.py. It iterates
    over each test case to count the passed assertions for both the baseline and
    the skill-active responses. It then calculates the percentage scores and
    performance gain, outputting the details to a Markdown report ('grader.md')
    and persisting the metrics in a JSON file ('benchmark.json').
    """
    script_dir = os.path.dirname(os.path.abspath(__file__))
    results_path = os.path.join(script_dir, "results.json")

    # Load the simulation results
    with open(results_path, 'r') as f:
        results = json.load(f)

    # Initialize the Markdown report string
    markdown = "# Evals Grading Report\n\n"
    markdown += "This report grades the performance of the `jules-companion` skill against baseline runs.\n\n"
    
    total_assertions = 0
    baseline_passed_count = 0
    skill_passed_count = 0
    
    # Iterate through each test case result to tally scores and format the report
    for r in results:
        markdown += f"## Test Case: {r['id']}\n"
        markdown += f"**Prompt**: `{r['prompt']}`\n\n"
        
        # Format baseline section
        markdown += "### Baseline Run\n"
        markdown += f"*Response*: *\"{r['baseline']['response']}\"*\n"
        for ass in r['baseline']['assertions']:
            total_assertions += 1
            status = "✅ PASS" if ass['passed'] else "❌ FAIL"
            if ass['passed']:
                baseline_passed_count += 1
            markdown += f"- [{status}] {ass['assertion']}\n"
        
        # Format skill-active section
        markdown += "\n### With Skill Active Run\n"
        markdown += f"*Response*: *\"{r['with_skill']['response']}\"*\n"
        for ass in r['with_skill']['assertions']:
            status = "✅ PASS" if ass['passed'] else "❌ FAIL"
            if ass['passed']:
                skill_passed_count += 1
            markdown += f"- [{status}] {ass['assertion']}\n"
        markdown += "\n---\n\n"
        
    # Calculate percentage scores (prevent division by zero implicitly if assertions exist)
    baseline_score = (baseline_passed_count / total_assertions) * 100 if total_assertions > 0 else 0
    skill_score = (skill_passed_count / total_assertions) * 100 if total_assertions > 0 else 0
    
    # Append the final summary block to the Markdown report
    summary = (
        f"## Summary\n"
        f"- **Total Assertions Checked**: {total_assertions}\n"
        f"- **Baseline Score**: {baseline_score:.1f}% ({baseline_passed_count}/{total_assertions} passed)\n"
        f"- **With Skill Active Score**: {skill_score:.1f}% ({skill_passed_count}/{total_assertions} passed)\n"
        f"- **Performance Gain**: +{skill_score - baseline_score:.1f}%\n"
    )
    
    markdown = markdown + summary
    
    # Write the Markdown report to disk
    grader_path = os.path.join(script_dir, "grader.md")
    with open(grader_path, 'w') as f:
        f.write(markdown)
    
    # Save benchmark metrics to a structured JSON file for programmatic access
    benchmark = {
        "total_test_cases": len(results),
        "total_assertions": total_assertions,
        "baseline_passed": baseline_passed_count,
        "skill_passed": skill_passed_count,
        "baseline_score_pct": baseline_score,
        "skill_score_pct": skill_score,
        "gain_pct": skill_score - baseline_score
    }
    
    benchmark_path = os.path.join(script_dir, "benchmark.json")
    os.makedirs(os.path.dirname(benchmark_path), exist_ok=True)
    with open(benchmark_path, 'w') as f:
        json.dump(benchmark, f, indent=2)

    print(f"Grading completed. Report written to {grader_path}")

if __name__ == "__main__":
    grade_results()
