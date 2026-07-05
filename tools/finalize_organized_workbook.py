"""Finalize workbook layout details not persisted by artifact-tool export."""

from __future__ import annotations

import argparse
from pathlib import Path

import openpyxl


def finalize_workbook(path: Path) -> None:
    workbook = openpyxl.load_workbook(path)
    try:
        for worksheet in workbook.worksheets:
            worksheet.freeze_panes = "A2"
            worksheet.sheet_view.showGridLines = False
        workbook.save(path)
    finally:
        workbook.close()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workbook", type=Path)
    args = parser.parse_args()
    finalize_workbook(args.workbook)
    print(f"Finalized workbook layout: {args.workbook}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
