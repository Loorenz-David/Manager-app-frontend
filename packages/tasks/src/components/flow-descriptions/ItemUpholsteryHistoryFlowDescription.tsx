const CREATE_ITEM_UPHOLSTERY_RE = /^(.+?) added a upholstery '(.+?)' to item$/;
const UPDATE_ITEM_UPHOLSTERY_RE = /^(.+?) updated (.+?) on upholstery '(.+?)'$/;
const DELETE_ITEM_UPHOLSTERY_RE =
  /^(.+?) deleted a upholstery '(.+?)' from item$/;

function BoldName({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <span className="font-bold capitalize">{children}</span>;
}

function MutedBoldName({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <span className="font-bold capitalize text-muted-foreground">
      {children}
    </span>
  );
}

function BoldFields({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <span className="font-bold">{children}</span>;
}

type ItemUpholsteryHistoryFlowDescriptionProps = {
  description: string;
};

export function ItemUpholsteryHistoryFlowDescription({
  description,
}: ItemUpholsteryHistoryFlowDescriptionProps): React.JSX.Element {
  const createMatch = CREATE_ITEM_UPHOLSTERY_RE.exec(description);
  if (createMatch) {
    const [, username, upholsteryName] = createMatch;
    return (
      <span>
        <BoldName>{username}</BoldName>
        {" added a upholstery "}
        <MutedBoldName>{upholsteryName}</MutedBoldName>
        {" to item"}
      </span>
    );
  }

  const updateMatch = UPDATE_ITEM_UPHOLSTERY_RE.exec(description);
  if (updateMatch) {
    const [, username, fields, upholsteryName] = updateMatch;
    return (
      <span>
        <BoldName>{username}</BoldName>
        {" updated "}
        <BoldFields>{fields}</BoldFields>
        {" on upholstery "}
        <MutedBoldName>{upholsteryName}</MutedBoldName>
      </span>
    );
  }

  const deleteMatch = DELETE_ITEM_UPHOLSTERY_RE.exec(description);
  if (deleteMatch) {
    const [, username, upholsteryName] = deleteMatch;
    return (
      <span>
        <BoldName>{username}</BoldName>
        {" deleted a upholstery "}
        <MutedBoldName>{upholsteryName}</MutedBoldName>
        {" from item"}
      </span>
    );
  }

  return <span>{description}</span>;
}
