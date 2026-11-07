"""Execute a project notebook with this interpreter, saving outputs on failure.

Run from the project root:
    .venv/bin/python "rough work/scripts/execute_notebook.py"
    .venv/bin/python "rough work/scripts/execute_notebook.py" focused_final_pass.ipynb
Requires Java and localhost socket access for Jupyter and local Spark.
Uses an ephemeral kernel spec; does not register a machine-wide kernel.
"""

import argparse
import json
import os
from pathlib import Path
import sys
import tempfile

import nbformat
from nbclient import NotebookClient


def main():
    root = Path(__file__).resolve().parents[2]
    notebook_folder = root / 'rough work' / 'notebooks'
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("notebook", nargs="?", default="exp.ipynb")
    args = parser.parse_args()
    path = (notebook_folder / args.notebook).resolve()
    if path.suffix != ".ipynb" or not path.is_file():
        parser.error("Choose an existing .ipynb file.")
    notebook = nbformat.read(path, as_version=4)
    nbformat.validate(notebook)
    with tempfile.TemporaryDirectory(prefix="lila-kernel-") as directory:
        kernel = Path(directory) / "kernels" / "lila-audit"
        kernel.mkdir(parents=True)
        (kernel / "kernel.json").write_text(json.dumps({
            "argv": [sys.executable, "-m", "ipykernel_launcher", "-f", "{connection_file}"],
            "display_name": "LILA audit", "language": "python",
        }))
        previous_path = os.environ.get("JUPYTER_PATH")
        os.environ["JUPYTER_PATH"] = directory + (os.pathsep + previous_path if previous_path else "")
        os.environ.setdefault("SPARK_LOCAL_IP", "127.0.0.1")
        os.environ.setdefault("PYSPARK_PYTHON", sys.executable)
        os.environ.setdefault("MPLCONFIGDIR", "/private/tmp/lila-matplotlib")

        def report(cell_index, **kwargs):
            print(f"Executing cell {cell_index + 1}/{len(notebook.cells)}", flush=True)

        def save_progress(**kwargs):
            nbformat.write(notebook, path)

        client = NotebookClient(
            notebook, kernel_name="lila-audit", timeout=600,
            resources={"metadata": {"path": str(root)}}, on_cell_start=report,
            on_cell_executed=save_progress,
        )
        try:
            client.execute()
        finally:
            notebook.metadata.kernelspec = {
                "display_name": "Python (.venv)", "language": "python", "name": "python3",
            }
            nbformat.write(notebook, path)
            if previous_path is None:
                os.environ.pop("JUPYTER_PATH", None)
            else:
                os.environ["JUPYTER_PATH"] = previous_path
    print(f"Saved executed notebook: {path}")


if __name__ == "__main__":
    main()
