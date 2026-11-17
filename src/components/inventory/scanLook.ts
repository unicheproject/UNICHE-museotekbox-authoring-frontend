import type { Component } from 'vue'
import { Box, CreditCard, Image, PencilLine, ScanLine } from 'lucide-vue-next'
import type { CardColour, ScanObjectDto, ScanObjectKind, ScanObjectTypeDto } from '@/api/museotekBox'
import { KIND_LABEL, resolveScanObjectKind } from '@/api/museotekBox'
import { colorHex } from '@/lib/authoring/engine'

/** The icon of each kind of scan object, for its card band and header. */
export const KIND_ICON: Record<ScanObjectKind, Component> = {
  COLOURED_CARD: CreditCard,
  PRINTED_IMAGE: Image,
  THREE_D_PRINTED_OBJECT: Box,
  DRAFT: PencilLine,
}

/** A coloured card's colour, from the app's own palette (the one replies use); white is white. */
export function cardColourHex(colour: CardColour | null): string | null {
  if (!colour) return null
  return colour === 'WHITE' ? '#ffffff' : colorHex(colour.toLowerCase())
}

/** How a scan object's card looks: icon, band colour, and the line under its name. */
export function scanObjectLook(object: ScanObjectDto, types: Record<number, ScanObjectTypeDto>) {
  const kind = resolveScanObjectKind(object.kind)
  const type = object.scanObjectTypeId !== null ? types[object.scanObjectTypeId] : undefined
  const colour = kind === 'COLOURED_CARD' ? cardColourHex(object.colour) : null
  return {
    kind,
    kindLabel: kind ? KIND_LABEL[kind] : object.kind || 'Unknown kind',
    icon: kind ? KIND_ICON[kind] : ScanLine,
    colour,
    darkIcon: object.colour === 'WHITE',
    /** Its card type, or null for none; a type id the list does not have shows as "Type #N". */
    typeName: object.scanObjectTypeId === null ? null : (type?.name ?? `Type #${object.scanObjectTypeId}`),
    type,
  }
}
