#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
G-Browser Production Branding Asset Generator
==============================================
Generates high-definition, multi-resolution visual assets for G-Browser:
- High-res PNG asset packs (16px to 1024px) for standard and private browsing
- Typography wordmark renders (360px to 1440px)
- Multi-resolution Windows .ico binaries (16, 24, 32, 48, 64, 128, 256px)
- Automated deployment to packaging, installer, and browser chrome runtime dirs.

Requires: PySide6, Pillow
"""

import sys
import os
import shutil
import logging
from pathlib import Path
from PIL import Image

try:
    from PySide6.QtGui import QGuiApplication, QImage, QPainter
    from PySide6.QtSvg import QSvgRenderer
    from PySide6.QtCore import Qt, QSize
except ImportError as err:
    raise RuntimeError(
        "PySide6 is required to render vector SVG assets with high fidelity: " + str(err)
    )

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s: %(message)s")
logger = logging.getLogger("branding-gen")


class BrandingGenerator:
    """Renders vector SVGs and packages full platform-ready icon suites."""

    def __init__(self, root_dir: Path):
        self.root_dir = root_dir.resolve()
        self.branding_dir = self.root_dir / "branding"
        self.dist_dir = self.branding_dir / "dist"

        self.logo_svg = self.branding_dir / "logo.svg"
        self.logo_private_svg = self.branding_dir / "logo-private.svg"
        self.wordmark_svg = self.branding_dir / "wordmark.svg"

        self._qapp = QGuiApplication.instance() or QGuiApplication(sys.argv)

    def render_svg_to_qimage(self, svg_path: Path, width: int, height: int) -> QImage:
        """Render an SVG to a high-precision ARIA/subpixel-antialiased QImage."""
        if not svg_path.is_file():
            raise FileNotFoundError(f"Source SVG not found: {svg_path}")

        renderer = QSvgRenderer(str(svg_path))
        if not renderer.isValid():
            raise ValueError(f"Invalid SVG file format: {svg_path}")

        img = QImage(width, height, QImage.Format.Format_ARGB32_Premultiplied)
        img.fill(Qt.GlobalColor.transparent)

        painter = QPainter(img)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)
        painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform, True)
        renderer.render(painter)
        painter.end()

        return img

    def render_svg_to_pil(self, svg_path: Path, width: int, height: int) -> Image.Image:
        """Render SVG directly into a Pillow Image via memory buffer."""
        qimg = self.render_svg_to_qimage(svg_path, width, height)
        # Convert QImage to RGBA format for PIL
        qimg_rgba = qimg.convertToFormat(QImage.Format.Format_RGBA8888)
        width = qimg_rgba.width()
        height = qimg_rgba.height()
        ptr = qimg_rgba.bits()
        # Create PIL Image from bytes
        byte_data = bytes(ptr)
        pil_img = Image.frombuffer("RGBA", (width, height), byte_data, "raw", "RGBA", 0, 1)
        return pil_img.copy()

    def generate_png_set(self, svg_path: Path, output_dir: Path, prefix: str, sizes: list[int]):
        """Generate high quality PNGs across all required dimensions."""
        output_dir.mkdir(parents=True, exist_ok=True)
        # Render high-resolution master first (1024x1024)
        master_size = 1024
        logger.info(f"Rendering master {prefix} at {master_size}x{master_size}...")
        master_pil = self.render_svg_to_pil(svg_path, master_size, master_size)

        for size in sizes:
            out_file = output_dir / f"{prefix}-{size}.png"
            if size == master_size:
                master_pil.save(out_file, format="PNG", optimize=True)
            else:
                # High quality downsampling using Lanczos
                resized = master_pil.resize((size, size), Image.Resampling.LANCZOS)
                resized.save(out_file, format="PNG", optimize=True)
            logger.info(f"  Generated: {out_file.name} ({size}x{size})")

    def generate_wordmark_set(self, svg_path: Path, output_dir: Path, scales: list[int]):
        """Generate typography wordmark renders at multiple scale factors."""
        output_dir.mkdir(parents=True, exist_ok=True)
        base_w, base_h = 360, 80
        for scale in scales:
            w, h = base_w * scale, base_h * scale
            pil_img = self.render_svg_to_pil(svg_path, w, h)
            out_file = output_dir / f"wordmark-{w}x{h}.png"
            pil_img.save(out_file, format="PNG", optimize=True)
            logger.info(f"  Generated Wordmark: {out_file.name} ({w}x{h})")

    def generate_multi_layer_ico(self, svg_path: Path, out_ico_path: Path, sizes: list[int]):
        """Generate a Windows-compliant multi-resolution .ico container."""
        out_ico_path.parent.mkdir(parents=True, exist_ok=True)
        # Render 256x256 as master for ICO
        master_img = self.render_svg_to_pil(svg_path, 256, 256)
        ico_sizes = [(s, s) for s in sizes]
        master_img.save(out_ico_path, format="ICO", sizes=ico_sizes)
        logger.info(f"Generated Multi-Layer ICO: {out_ico_path.name} with sizes: {sizes}")

    def build_all_assets(self):
        """Build the complete standalone branding package in branding/dist/."""
        logger.info("Building standalone branding distribution package...")

        # 1. SVGs
        dist_svg = self.dist_dir / "svg"
        dist_svg.mkdir(parents=True, exist_ok=True)
        shutil.copy2(self.logo_svg, dist_svg / "logo.svg")
        shutil.copy2(self.logo_private_svg, dist_svg / "logo-private.svg")
        shutil.copy2(self.wordmark_svg, dist_svg / "wordmark.svg")

        # 2. PNG Sets
        dist_png = self.dist_dir / "png"
        icon_sizes = [16, 24, 32, 48, 64, 96, 128, 192, 256, 384, 512, 1024]
        logger.info("Generating standard brand PNGs...")
        self.generate_png_set(self.logo_svg, dist_png, "logo", icon_sizes)

        logger.info("Generating private browsing brand PNGs...")
        self.generate_png_set(self.logo_private_svg, dist_png, "logo-private", icon_sizes)

        logger.info("Generating wordmark PNGs...")
        self.generate_wordmark_set(self.wordmark_svg, dist_png, [1, 2, 4])

        # 3. Multi-layer ICOs
        dist_ico = self.dist_dir / "ico"
        ico_sizes = [16, 24, 32, 48, 64, 128, 256]
        self.generate_multi_layer_ico(self.logo_svg, dist_ico / "g-browser.ico", ico_sizes)
        self.generate_multi_layer_ico(self.logo_private_svg, dist_ico / "g-browser-private.ico", ico_sizes)
        self.generate_multi_layer_ico(self.logo_svg, dist_ico / "document.ico", ico_sizes)
        self.generate_multi_layer_ico(self.logo_svg, dist_ico / "kit.ico", ico_sizes)

        logger.info("Stand-alone distribution asset suite generated successfully.")

    def deploy_to_runtime(self):
        """Deploy branding assets to browser package, installer, and app chrome."""
        logger.info("Deploying branding assets to application runtime and packaging targets...")
        dist_png = self.dist_dir / "png"
        dist_ico = self.dist_dir / "ico"

        # A. Browser Chrome branding directory
        chrome_branding = self.root_dir / "_dist" / "package" / "floorp" / "browser" / "chrome" / "browser" / "content" / "branding"
        if chrome_branding.is_dir():
            logger.info(f"Updating chrome branding: {chrome_branding}")
            # Standard logo SVG & Wordmark SVG
            shutil.copy2(self.logo_svg, chrome_branding / "about-logo.svg")
            shutil.copy2(self.wordmark_svg, chrome_branding / "about-wordmark.svg")

            # Standard logo PNGs
            shutil.copy2(dist_png / "logo-192.png", chrome_branding / "about-logo.png")
            shutil.copy2(dist_png / "logo-384.png", chrome_branding / "about-logo@2x.png")
            shutil.copy2(dist_png / "logo-256.png", chrome_branding / "about.png")

            # Private browsing PNGs
            shutil.copy2(dist_png / "logo-private-192.png", chrome_branding / "about-logo-private.png")
            shutil.copy2(dist_png / "logo-private-384.png", chrome_branding / "about-logo-private@2x.png")

            # Window and toolbar icons
            shutil.copy2(dist_png / "logo-16.png", chrome_branding / "icon16.png")
            shutil.copy2(dist_png / "logo-32.png", chrome_branding / "icon32.png")
            shutil.copy2(dist_png / "logo-48.png", chrome_branding / "icon48.png")
            shutil.copy2(dist_png / "logo-64.png", chrome_branding / "icon64.png")
            shutil.copy2(dist_png / "logo-128.png", chrome_branding / "icon128.png")

            # ICO files
            shutil.copy2(dist_ico / "document.ico", chrome_branding / "document.ico")
            shutil.copy2(dist_ico / "g-browser-private.ico", chrome_branding / "floorp-pb-toolbar-icon.ico")
            logger.info("  Chrome branding files deployed.")

        # B. Native Installer Icon
        native_kit_ico = self.root_dir / "tools" / "native" / "kit.ico"
        if native_kit_ico.parent.is_dir():
            shutil.copy2(dist_ico / "kit.ico", native_kit_ico)
            logger.info(f"Updated installer icon: {native_kit_ico}")

        # C. Tauri / Stub Installer Icons
        tauri_icons = self.root_dir / "static" / "installers" / "stub-win64-installer" / "src-tauri" / "icons"
        if tauri_icons.is_dir():
            logger.info(f"Updating Tauri installer icons: {tauri_icons}")
            shutil.copy2(dist_ico / "g-browser.ico", tauri_icons / "icon.ico")
            shutil.copy2(dist_png / "logo-512.png", tauri_icons / "icon.png")
            shutil.copy2(dist_png / "logo-32.png", tauri_icons / "32x32.png")
            shutil.copy2(dist_png / "logo-128.png", tauri_icons / "128x128.png")
            shutil.copy2(dist_png / "logo-256.png", tauri_icons / "128x128@2x.png")
            shutil.copy2(dist_png / "logo-48.png", tauri_icons / "StoreLogo.png")
            shutil.copy2(dist_png / "logo-48.png", tauri_icons / "Square44x44Logo.png")
            shutil.copy2(dist_png / "logo-64.png", tauri_icons / "Square71x71Logo.png")
            shutil.copy2(dist_png / "logo-96.png", tauri_icons / "Square89x89Logo.png")
            shutil.copy2(dist_png / "logo-96.png", tauri_icons / "Square107x107Logo.png")
            shutil.copy2(dist_png / "logo-128.png", tauri_icons / "Square142x142Logo.png")
            shutil.copy2(dist_png / "logo-128.png", tauri_icons / "Square150x150Logo.png")
            shutil.copy2(dist_png / "logo-256.png", tauri_icons / "Square284x284Logo.png")
            shutil.copy2(dist_png / "logo-384.png", tauri_icons / "Square310x310Logo.png")
            logger.info("  Tauri installer icons deployed.")

        # D. Workspace icon
        ws_icon = self.root_dir / "browser-features" / "chrome" / "common" / "workspaces" / "icons" / "workspace-floorp.png"
        if ws_icon.parent.is_dir():
            shutil.copy2(dist_png / "logo-32.png", ws_icon)
            logger.info(f"Updated workspace icon: {ws_icon}")


def main():
    root_dir = Path(__file__).resolve().parent.parent
    generator = BrandingGenerator(root_dir)
    generator.build_all_assets()
    generator.deploy_to_runtime()
    logger.info("All G-Browser visual branding assets generated and deployed successfully!")


if __name__ == "__main__":
    main()
