import { ReactStateDeclaration } from "@uirouter/react";
import Party from "./Party";

export const states: ReactStateDeclaration[] = [{
  name: 'destiny2.party',
  component: Party,
  url: '/party'
}];
