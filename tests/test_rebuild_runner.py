from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


class RebuildRunnerTests(unittest.TestCase):
    def test_power_shell_runner_documents_heap_and_finalizer_steps(self):
        runner = ROOT / "tools" / "build_organized_workbook.ps1"
        self.assertTrue(runner.exists(), "missing workbook rebuild runner")

        text = runner.read_text(encoding="utf-8")
        self.assertIn("--max-old-space-size=8192", text)
        self.assertIn("build_organized_workbook.mjs", text)
        self.assertIn("finalize_organized_workbook.py", text)
        self.assertIn("10124-users.organized.xlsx", text)

    def test_readme_has_canonical_workbook_rebuild_command(self):
        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        self.assertIn("tools\\build_organized_workbook.ps1", readme)
        self.assertIn("10124-users.organized.xlsx", readme)


if __name__ == "__main__":
    unittest.main()
