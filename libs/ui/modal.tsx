import { Dialog, Portal } from "@chakra-ui/react";
import { useLayoutEffect, useRef } from "react";
import { Button } from "./button.tsx";
import type { ModalProps } from "./types.ts";
import styles from "./dialog.module.css";
import { useStandardControls } from "./control-theme.ts";

export function Modal(
  {
    title,
    children,
    onClose,
    closeLabel = "Close",
    closeOnEscape = true,
    wide = false,
  }: ModalProps,
) {
  const standard = useStandardControls();
  const openerRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (document.activeElement instanceof HTMLElement) {
      openerRef.current = document.activeElement;
    }
  }, []);

  return (
    <Dialog.Root
      open
      placement="center"
      size={wide ? "lg" : "md"}
      onOpenChange={({ open }) => {
        if (!open) onClose();
      }}
      closeOnEscape={closeOnEscape}
      closeOnInteractOutside={false}
      trapFocus={true}
      finalFocusEl={() => openerRef.current}
    >
      <Portal>
        <Dialog.Backdrop className={standard ? undefined : styles.backdrop} />
        <Dialog.Positioner className={standard ? undefined : styles.positioner}>
          <Dialog.Content
            className={standard ? "floorp-standard-ui" : styles.content}
            data-wide={wide}
            maxH={standard ? "calc(100dvh - 40px)" : undefined}
            overflowY={standard ? "auto" : undefined}
            mx={standard ? "5" : undefined}
          >
            <Dialog.Header
              className={standard ? undefined : styles.header}
              display={standard ? "flex" : undefined}
              justifyContent={standard ? "space-between" : undefined}
              alignItems={standard ? "center" : undefined}
            >
              <Dialog.Title className={standard ? undefined : styles.title}>
                {title}
              </Dialog.Title>
              <Button
                variant="ghost"
                aria-label={closeLabel || "Close"}
                onClick={onClose}
              >
                <span aria-hidden="true">×</span>
              </Button>
            </Dialog.Header>
            <Dialog.Body className={standard ? undefined : styles.body}>
              {children}
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
