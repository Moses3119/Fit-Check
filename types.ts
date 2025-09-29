/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export interface WardrobeItem {
  id: string;
  name: string;
  url: string;
  type: 'top';
}

export interface OutfitLayer {
  garment: WardrobeItem | null; // null represents the base model layer
  poseImages: Record<string, string>; // Maps pose instruction to image URL
}

export type ColorPalette = string[];

export interface EditorState {
  modelImageUrl: string | null;
  outfitHistory: OutfitLayer[];
  currentOutfitIndex: number;
  currentPose: string;
}

export interface SavedLook {
  id: string;
  thumbnailUrl: string;
  savedAt: string; // ISO date string
  editorState: EditorState;
}