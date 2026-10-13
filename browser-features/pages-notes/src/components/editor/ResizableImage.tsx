import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

const ALLOWED_SRC_PATTERNS = [
    /^https:\/\//,
    /^data:image\/(jpeg|png|gif|webp|svg\+xml);/,
];

function isSafeSrc(src: unknown): boolean {
    if (typeof src !== "string") return false;
    return ALLOWED_SRC_PATTERNS.some((pattern) => pattern.test(src));
}

export function ResizableImage({ node, updateAttributes, selected }: NodeViewProps) {
    const { t } = useTranslation();
    const imgRef = useRef<HTMLImageElement>(null);
    const safeSrc = useMemo(() => (isSafeSrc(node.attrs.src) ? node.attrs.src as string : ""), [node.attrs.src]);

    const handleResize = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();

            const startX = e.clientX;
            const startWidth = imgRef.current?.offsetWidth || 200;

            const onMouseMove = (ev: MouseEvent) => {
                const newWidth = Math.max(40, Math.round(startWidth + (ev.clientX - startX)));
                updateAttributes({ width: newWidth });
            };

            const onMouseUp = () => {
                document.removeEventListener("mousemove", onMouseMove);
                document.removeEventListener("mouseup", onMouseUp);
            };

            document.addEventListener("mousemove", onMouseMove, { passive: true });
            document.addEventListener("mouseup", onMouseUp);
        },
        [updateAttributes],
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            const currentWidth = (node.attrs.width as number) || imgRef.current?.offsetWidth || 200;
            const step = e.shiftKey ? 50 : 20;
            if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                e.preventDefault();
                updateAttributes({ width: Math.min(1200, currentWidth + step) });
            } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                e.preventDefault();
                updateAttributes({ width: Math.max(40, currentWidth - step) });
            }
        },
        [node.attrs.width, updateAttributes],
    );

    return (
        <NodeViewWrapper className="my-2">
            <div className="relative inline-block max-w-full">
                <img
                    ref={imgRef}
                    src={safeSrc}
                    alt={node.attrs.alt || ""}
                    style={node.attrs.width ? { width: `${node.attrs.width}px` } : undefined}
                    className={`block max-w-full h-auto rounded-lg ${selected ? "ring-2 ring-primary/60" : ""}`}
                    draggable={false}
                />
                {selected && (
                    <div
                        role="separator"
                        tabIndex={0}
                        aria-orientation="horizontal"
                        aria-valuenow={(node.attrs.width as number) || 200}
                        aria-valuemin={40}
                        aria-valuemax={1200}
                        aria-label={t("editor.resizeImage", { defaultValue: "Resize image" })}
                        className="absolute -right-2 -bottom-2 w-5 h-5 min-w-[24px] min-h-[24px] flex items-center justify-center bg-primary rounded-full cursor-se-resize shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary forced-colors:border-2 forced-colors:border-current"
                        onMouseDown={handleResize}
                        onKeyDown={handleKeyDown}
                    />
                )}
            </div>
        </NodeViewWrapper>
    );
}
