from __future__ import annotations

import argparse
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--backend-root", required=True)
    parser.add_argument("--submissions-folder", required=True)
    parser.add_argument("--rubric-path", required=True)
    args = parser.parse_args()

    backend_root = Path(args.backend_root).resolve()
    import os
    os.chdir(backend_root)
    if str(backend_root) not in sys.path:
        sys.path.insert(0, str(backend_root))

    print("=== STAGE: Booting Grader Runtime ===", flush=True)

    from main import run_grader  # type: ignore

    run_grader(
        submissions_folder=args.submissions_folder,
        rubric_path=args.rubric_path,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
