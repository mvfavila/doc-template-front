import subprocess
import os
import logging
from pathlib import Path
import shutil

logger = logging.getLogger(__name__)

def convert_to_pdf(docx_path: str) -> str:
    try:
        # Validate input file
        if not os.path.exists(docx_path):
            raise FileNotFoundError(f"Input file not found: {docx_path}")

        # Find LibreOffice binary
        libreoffice_path = shutil.which("libreoffice") or shutil.which("soffice")
        if not libreoffice_path:
            raise RuntimeError("LibreOffice not found in PATH")

        # Prepare output directory
        output_dir = os.path.dirname(docx_path)
        output_pdf = os.path.splitext(docx_path)[0] + ".pdf"

        # Run LibreOffice in headless mode
        cmd = [
            libreoffice_path,
            "--headless",
            "--convert-to", "pdf",
            "--outdir", output_dir,
            docx_path
        ]
        
        logger.info(f"Running command: {' '.join(cmd)}")
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True
        )
        
        # Log LibreOffice output
        if result.stdout:
            logger.debug(f"LibreOffice stdout: {result.stdout}")
        if result.stderr:
            logger.warning(f"LibreOffice stderr: {result.stderr}")

        if not os.path.exists(output_pdf):
            raise RuntimeError(f"PDF not generated at {output_pdf}")

        logger.info(f"Successfully converted to PDF: {output_pdf}")
        return output_pdf

    except subprocess.CalledProcessError as e:
        logger.error(
            f"LibreOffice failed with code {e.returncode}: {e.stderr}",
            exc_info=True
        )
        raise
    except Exception as e:
        logger.error(f"PDF conversion failed: {str(e)}", exc_info=True)
        raise