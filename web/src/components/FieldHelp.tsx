interface Props {
  text: string;
  href?: string;
  linkLabel?: string;
}

// Inline explanation for a manually-entered field, per spec section 9
// ("In-app help for every manual entry point") — a one-line note on what's
// expected and, where an external source exists, a direct link to it.
export function FieldHelp({ text, href, linkLabel }: Props) {
  return (
    <p className="field-help">
      {text}
      {href && (
        <>
          {" "}
          <a href={href} target="_blank" rel="noreferrer">
            {linkLabel ?? "Open source →"}
          </a>
        </>
      )}
    </p>
  );
}
