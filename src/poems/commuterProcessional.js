const text = {
  default: `canticles=of=feet well-paved=hymns+intoned=in=pious=shufflings consecrated=anxieties legacies=of=passage storefront=altars ambulatory=rites gods=devour=their=offerings+with=gaping=toothless=doorways latecomers=ascend=to=sit+at=the=right=hand=of=Loss asphalt=alleluias=rise updrafts=of=corporate=sacrament gusts=of=urban=sanctity the=litany=of=soles crowd-sourced=gods+shimmering=in=the=mind psalms=of=cement the=liturgy=of=shoe=leather+swells=to=full=volume in=fan-vaulted-sunlight discarded=prayer=fragments penitents=disgorged=from=subways commandments=of=exhaust=ascend`,
  secondary: `visionary=bustle+upon=the=blind=sidewalks amid=the=potted=trees latecomers=descend=to=lie+beneath=the=feet=of=Profit stoplights+perform=their=green=rites the=innocence=of=sheep+whitening=the=walkways stoplights+play=the=numbers brothers=in=faith+crossing=against=the=light souls=saved+for=a=rainy=day`,
  winds: `2=Secretaries an=Administrative=Assistant a=Chief=People=Officer an=Environmental=Lawyer a=Veterinary=Student a=Fry=Cook 3=Facilities=Custodians a=School=Librarian 2=Senior=Managers a=Police=Officer the=Cable=Guy a=Homeless=Man a=Dog a=Tailor's=Assistant a=Sports=Writer 6=Seventh=Graders a=Personal=Trainer an=Unemployed=Chef 2=Software=Engineers a=Pharmacist a=Supermarket=Clerk a=Department=Store=Cashier a=Talent=Delivery=Specialist a=Chick=Sexer an=Animal=Colorist a=Marketing=Director a=Hotel=Receptionist a=Balloon=Artist 2=Color=Distribution=Technicians a=Nutrition=Consultant a=Communications=Ambassador a=Scrum=Master a=Brand=Evangelist a=Machinist a=Best=Boy=Grip a=Bricklayer a=Taxi=Driver 2=Beauticians a=Dog=Walker a=Maître=D' a=Journalist an=Elementary=School=Principal a=Bootblack an=Office=Manager an=Executive=Assistant a=Sales=Representative an=Information=Technology=Support=Analyst a=Mechanic a=Nurse=Practitioner a=Barista an=Adjunct=Professor=of=Sociology a=Restaurant=Server 2=Musicology=Students a=Wedding=Planner a=First=Chair=Violinist a=Hotel=Doorman a=High=School=Counselor a=Mail=Carrier a=Mail=Sorter a=Parking=Enforcement=Officer a=Customer=Experience=Specialist a=Promotions=Coordinator a=Roman=Catholic=Priest an=Assistant=Rabbi a=Benefits=Coordinator a=Seventh=Grade=Hebrew=Teacher a=Warehouse=Forklift=Operator a=Last=Mile=Flatbed=Delivery=Driver a=Shipping=Clerk a=Lumber=Yard=Worker an=Automitive=Sales=Associate a=Real=Estate=Agent a=Tree=Climber a=Landscape=Maintenance=Foreman a=Defuel=Technician an=Arborist an=Irrigation=Technician a=Consumable=Assembler an=Asphalt=Raker a=Freight=Conductor a=Loan=Officer=Assistant a=Loan=Officer a=Retail=Janitorial=Associate a=Postal=Window=Clerk a=Student=Truck=Driver an=Accounts=Payable=Clerk`,
  traffic: `long=car-lined=naves unseen=celebrants+swinging=carbon=monoxide=censers sermons=of=traffic vehicular=choirs crosswalk=consecration canticles=of=cars auto=visions`,
  short: `staccato=steps the=communion=of=clocks+striking=bargains=with=the=hour pizzicato=spiritis lightly=plucked=destinies time=tick=tick=ticking`,
  fast: `hustling sure-footed rushed never-quite=holy devotional iconic gloria=patri hopeful almost=on=time allegretto in=step busy abrupt in=tempo precipitoso sempre=accelerando with=ceremony in=nomine=Domini pell-mell observant hallowed chaste innocent undefiled latent urgent scattered`
}

const aliases = [
  [['tuned', 'per', 'bra2'], 'secondary'],
  [['primaryWinds', 'win'], 'winds'],
  [['pizz'], 'short'],
  [['bra1'], 'traffic'],
]

const styles = {winds: 'emphasized'}

export default {
  text,
  aliases,
  styles,
}