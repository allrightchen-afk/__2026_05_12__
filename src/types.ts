/**
 * Game types and interfaces
 */

export interface Point {
  x: number;
  y: number;
}

export interface Entity extends Point {
  width: number;
  height: number;
}

export interface Ball extends Point {
  radius: number;
  dx: number;
  dy: number;
}

export interface Brick extends Entity {
  visible: boolean;
  color: string;
  points: number;
}

export type GameStatus = "START" | "PLAYING" | "GAMEOVER" | "WON";
