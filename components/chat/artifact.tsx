"use client";

// Stub artifact module — artifact system has been removed from this project.
// These types and exports are preserved for type-compatibility with remaining components.

export type ArtifactKind = "text" | "code" | "sheet" | "image";

export type UIArtifact = {
  documentId: string;
  content: string;
  kind: ArtifactKind;
  title: string;
  status: "streaming" | "idle";
  isVisible: boolean;
  boundingBox: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
};

// Re-exported from create-artifact to avoid duplicate type definitions
import type { ArtifactToolbarItem as _ArtifactToolbarItem } from "./create-artifact";

export type { ArtifactToolbarItem } from "./create-artifact";

export type ArtifactDefinition = {
  kind: ArtifactKind;
  description: string;
  content: React.ComponentType<unknown>;
  actions: _ArtifactToolbarItem[];
  toolbar: _ArtifactToolbarItem[];
  onStreamPart?: (params: {
    streamPart: unknown;
    setArtifact: (
      updater: UIArtifact | ((current: UIArtifact) => UIArtifact)
    ) => void;
    setMetadata: (metadata: unknown) => void;
  }) => void;
  initialize?: (params: {
    documentId: string;
    setMetadata: (metadata: unknown) => void;
  }) => void;
};

export const artifactDefinitions: ArtifactDefinition[] = [];

export function Artifact(_props: { chatId: string; [key: string]: unknown }) {
  return null;
}
