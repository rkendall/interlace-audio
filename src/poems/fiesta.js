const text = {
  default: `dance=adrift+on=currents=of=feet snaking=rhythms+squeezing=the=captive=light itinerant=joy=unpacking=its=wares triumphs=wreathed=in=melody are=the=smoke=and=dagger=eyes+seeking=your=heart? harmonies=groping=the=body feral=movements=ready+to=crawl=into=the=arms silk=fantasies+clinging=to=the=legs swaying=daydreams spiced=eyes+seeking=you=out happiness=scheming=in=a=corner borrowed=passion`,
  secondary: `the=day+has=come=to=a=noisy=halt amber=zapateados tables=laden=with=invitation an=hour=burning=away+in=a=moment blunt=rhythm+beating=the=air celebration=on=loan untethered=harmonies fingers=of=wine notes=of=tequila notes=of=lime=and=salt arpeggios=of=pale=ale`,
  guitar: `razor-sharp=guitars honey-toothed=strings poems=of=fingerwork black=notes+spiraling=into=the=sun precarious=runs rampant=chords hands=sailing=upon=ebony ebullient=rasgueados clear=voices=of=wood=and=steel`,
  voice: `voices+conjure=up=departed=melodies old=refrains predatory=song+stalking=the=sadness soprano=coals+glowing=in=the=brazier song=lyrics=searching+for=entry=to=your=past`,
  fast: `feline=footed inexhaustible brazenly=victorious seductive crystalline lush joyous luxuriant slowly=unfolding florid heated raucous thick flaring incantatory elemental ardent wanton unrestrained cantando`,
}

const aliases = [
  [['str', 'pizz', 'primaryWinds', 'pia'], 'secondary'],
  [['primaryPlucked1', 'plucked1'], 'guitar'],
  [['voice'], 'voice'],
]

export default {
  text,
  aliases,
}