"""Resource admission checks without importing Linux-only deployment modules."""
import ast
from pathlib import Path
import unittest

SOURCE = Path(__file__).with_name('install-native-hub.py').read_text(encoding='utf-8')
parsed = ast.parse(SOURCE)
namespace = {}
exec(compile(ast.Module(body=[node for node in parsed.body if isinstance(node, ast.FunctionDef) and node.name == 'build_heap_mib'], type_ignores=[]), '<native-build-memory>', 'exec'), namespace)
budget = namespace['build_heap_mib']


class NativeBuildMemory(unittest.TestCase):
    def test_reported_memory_uses_a_two_gib_heap(self):
        self.assertEqual(budget(3345 * 1024), 2048)

    def test_existing_larger_budgets_are_preserved(self):
        for available, heap in [(3584, 2560), (3942, 2560), (4096, 3072), (8192, 3072)]:
            with self.subTest(available=available):
                self.assertEqual(budget(available * 1024), heap)

    def test_every_admitted_budget_reserves_at_least_one_gib(self):
        for available in range(3072, 10000):
            self.assertGreaterEqual(available - budget(available * 1024), 1024)

    def test_lower_boundary_and_rounding(self):
        self.assertEqual(budget(3072 * 1024), 2048)
        for available_kib in [0, 2048 * 1024, 3072 * 1024 - 1]:
            with self.subTest(available_kib=available_kib):
                with self.assertRaisesRegex(RuntimeError, '3072 MiB.*Live site unchanged'):
                    budget(available_kib)

    def test_admission_precedes_stage_creation_and_mutations(self):
        main = SOURCE[SOURCE.index('def main():'):]
        self.assertLess(main.index('build_heap_mib(available_kib)'), main.index('state.mkdir('))
        self.assertLess(main.index('build_heap_mib(available_kib)'), main.index('prepare-native-stage.py'))
        self.assertLess(main.index('if result.returncode:'), main.index("'activate', str(state"))


if __name__ == '__main__':
    unittest.main()
