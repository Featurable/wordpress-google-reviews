export default function UserAvatar({ user, ...rest }) {
	return (
		<img
			src={user?.pictureUrl}
			alt={user?.email?.charAt(0).toUpperCase()}
			height="32"
			width="32"
			style={{
				borderRadius: "100%",
				marginRight: "8px",
				height: "32px",
				width: "32px",
				background: "#2F3952",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				fontSize: "18px",
				fontWeight: "medium",
				color: "white",
				cursor: "pointer",
			}}
			{...rest}
		/>
	);
}
