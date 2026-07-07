import HandshakeIcon from "../HandshakeIcon.svg";

type HandshakeIconProps = React.ImgHTMLAttributes<HTMLImageElement>;

export function HandshakeIconComponent({
  alt = "",
  className,
  ...props
}: HandshakeIconProps): React.JSX.Element {
  return (
    <img
      alt={alt}
      aria-hidden="true"
      className={className}
      src={HandshakeIcon}
      {...props}
    />
  );
}
