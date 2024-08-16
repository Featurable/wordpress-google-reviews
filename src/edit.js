/**
 * Retrieves the translation of text.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-i18n/
 */
import { __, _n, sprintf } from "@wordpress/i18n";

/**
 * React hook that is used to mark the block wrapper element.
 * It provides all the necessary props like the class name.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-block-editor/#useblockprops
 */
import { InspectorControls, useBlockProps } from "@wordpress/block-editor";

import {
	Button,
	CheckboxControl,
	Modal,
	Panel,
	PanelBody,
	SelectControl,
	TextControl,
} from "@wordpress/components";
import { useDispatch, useSelect } from "@wordpress/data";
import { store as editorStore } from "@wordpress/editor";
import { useCallback, useEffect, useRef, useState } from "@wordpress/element";
import {
	Icon,
	brush,
	category,
	check,
	cog,
	commentAuthorName,
	header,
	plugins,
	starFilled,
	trash,
} from "@wordpress/icons";

/**
 * Lets webpack process CSS, SASS or SCSS files referenced in JavaScript files.
 * Those files can contain any CSS code that gets applied to the editor.
 *
 * @see https://www.npmjs.com/package/@wordpress/scripts#using-css
 */
import FeaturableIcon from "./components/FeaturableIcon";
import UserAvatar from "./components/UserAvatar";
import "./editor.scss";

/**
 * The edit function describes the structure of your block in the context of the
 * editor. This represents what the editor will render when the block is used.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#edit
 *
 * @return {Element} Element to render.
 */
export default function Edit({ attributes, setAttributes }) {
	const TEXT_DOMAIN = "featurable-google-reviews";

	const { isSaving } = useSelect((select) => ({
		isSaving: select(editorStore).isSavingPost(),
		isDirty: select(editorStore).isEditedPostDirty(),
	}));

	const { widgetId } = attributes;
	const reviewsContainerRef = useRef(null);

	const [isLoggedIn, setIsLoggedIn] = useState(false);
	const [widgets, setWidgets] = useState([]);
	const [accounts, setAccounts] = useState([]);
	const [locations, setLocations] = useState([]);
	const [loadingLocations, setLoadingLocations] = useState(false);
	const [loadingCreateWidget, setLoadingCreateWidget] = useState(false);
	const [loadingData, setLoadingData] = useState(false);
	const [userModalOpen, setUserModalOpen] = useState(false);
	const [account, setAccount] = useState(null);
	const [location, setLocation] = useState(null);
	const [widgetConfig, setWidgetConfig] = useState(
		JSON.parse(attributes.widgetConfig),
	);
	const [widgetLayout, setWidgetLayout] = useState(attributes.widgetLayout);
	const [createWidgetModalOpen, setCreateWidgetModalOpen] = useState(false);
	const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
	const [upgradeModalMessage, setUpgradeModalMessage] = useState("");
	const [user, setUser] = useState(null);
	const [authWindow, setAuthWindow] = useState(null);
	const { createNotice } = useDispatch("core/notices");

	// Check authentication status
	const checkAuthStatus = async () => {
		try {
			const response = await fetch(ajaxurl, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					action: "featurable_auth_check",
					nonce: featurableData.nonce,
				}),
			});

			if (response.ok) {
				const data = await response.json();
				if (data.success) {
					// Authentication successful
					setIsLoggedIn(true);
					setUser(data.data.user);
					return true;
				}
			} else {
				throw new Error("Authentication failed");
			}
		} catch (error) {
			console.error("Auth error:", error);
		}
		return false;
	};

	// Load widgets and accounts data
	const loadData = async () => {
		console.log("Loading data attempt");
		if (!isLoggedIn) return;
		console.log("Loading data");

		setLoadingData(true);
		try {
			const response = await fetch(ajaxurl, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					action: "featurable_load_data",
					nonce: featurableData.nonce,
				}),
			});

			if (response.ok) {
				const data = await response.json();
				if (data.success) {
					setWidgets(data.data.widgets);
					setAccounts(data.data.accounts);
				}
			} else {
				throw new Error("Failed to load data");
			}
		} catch (error) {
			console.log(error);
			createNotice(
				"error",
				"An unexpected error occurred while loading your data.",
				{
					isDismissible: true,
					type: "snackbar",
				},
			);
		}
		setLoadingData(false);
	};

	// Fetch widget data from Featurable API
	const getWidgetData = async () => {
		console.log("Get widget data attempt", widgetId);
		if (!widgetId) return;
		console.log("Get widget data", widgetId);

		try {
			const response = await fetch(ajaxurl, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					action: "featurable_get_widget_data",
					nonce: featurableData.nonce,
					widgetId: widgetId,
				}),
			});

			if (response.ok) {
				const data = await response.json();
				if (data.success) {
					setWidgetConfig(data.data.config);
					setWidgetLayout(data.data.layout);
				}
			} else {
				throw new Error("Failed to get widget data");
			}
		} catch (error) {
			console.log(error);
			createNotice(
				"error",
				"An unexpected error occurred while loading widget data.",
				{
					isDismissible: true,
					type: "snackbar",
				},
			);
		}
	};

	// Save widget data to Featurable API
	const saveWidget = async () => {
		if (!widgetId) return;
		console.log("SAVING WIDGET")

		try {
			const response = await fetch(ajaxurl, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					action: "featurable_save_widget",
					nonce: featurableData.nonce,
					widgetId: widgetId,
					widgetConfig: JSON.stringify(widgetConfig),
					widgetLayout: widgetLayout,
				}),
			});

			const data = await response.json();
			if (response.ok) {
				if (data.success) {
				}
			} else {
				throw new Error("Failed to save widget");
			}
		} catch (error) {
			console.log(error);
			createNotice(
				"error",
				"An unexpected error occurred while saving widget.",
				{
					isDismissible: true,
					type: "snackbar",
				},
			);
		}
	};

	// Initialize Featurable widget using global function
	const initializeWidget = useCallback(() => {
		if (window && window.initializeFeaturableWidget) {
			try {
				console.log("Initializing widget");
				window.initializeFeaturableWidget(
					`featurable-${widgetId}`,
					widgetConfig,
					widgetLayout,
				);
			} catch (error) {
				console.log(error);
				createNotice(
					"error",
					"An unexpected error occurred while rendering widget.",
					{
						isDismissible: true,
						type: "snackbar",
					},
				);
			}
		}
	}, [widgetId, widgetConfig, widgetLayout, window]);

	// Handle authentication callback
	const handleLoginCallback = async (token) => {
		try {
			const response = await fetch(ajaxurl, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					action: "featurable_auth_callback",
					token: token,
					nonce: featurableData.nonce,
				}),
			});

			if (response.ok) {
				const data = await response.json();
				if (data.success) {
					// Authentication successful
					setIsLoggedIn(true);
				}
			} else {
				throw new Error("Authentication failed");
			}
		} catch (error) {
			console.error("Auth error:", error);
			createNotice(
				"error",
				"An unexpected error occurred while authenticating.",
				{
					isDismissible: true,
					type: "snackbar",
				},
			);
		}
	};

	// Handle login button click
	const handleLogin = async () => {
		const newAuthWindow = window.open(
			"http://featurable.com/app?wp=true",
			"Auth",
			"width=1000,height=600",
		);
		setAuthWindow(newAuthWindow);
	};

	const capitalize = (str) => {
		if (!str) return str;
		return str.charAt(0).toUpperCase() + str.slice(1);
	};

	const sanitize = (str) => {
		if (!str) return str;
		return str.replace(/(<([^>]+)>)/gi, "");
	  };

	// Create a new widget using the Featurable API
	const handleCreateWidget = async () => {
		if (!account || !location) {
			return;
		}

		setLoadingCreateWidget(true);

		try {
			const response = await fetch(ajaxurl, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					action: "featurable_create_widget",
					nonce: featurableData.nonce,
					account: account,
					location: location,
				}),
			});
			const data = await response.json();
			if (data.success) {
				// Widget created successfully
				setLoadingCreateWidget(false);
				setCreateWidgetModalOpen(false);

				createNotice("success", "Widget created successfully", {
					isDismissible: true,
					type: "default",
				});

				await loadData();

				// Set the new widget as the active widget
				setAttributes({
					widgetId: data.data.widget_uid,
				});
			} else {
				const error = data.data;
				if (error.key === "widget_limit_reached") {
					setUpgradeModalMessage(
						"You've reached the widget limit for your account.",
					);
					setUpgradeModalOpen(true);
					setLoadingCreateWidget(false);
					return;
				}
			}
		} catch (error) {
			console.log(error);
		}
		setLoadingCreateWidget(false);
	};

	// List locations for the selected account
	const listLocations = async () => {
		setLoadingLocations(true);
		try {
			const response = await fetch(ajaxurl, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					action: "featurable_list_locations",
					nonce: featurableData.nonce,
					accountName: account,
				}),
			});

			if (response.ok) {
				const data = await response.json();
				if (data.success) {
					setLocations(data.data.locations);
				}
			} else {
				throw new Error("Failed to list locations");
			}
		} catch (error) {
			console.log(error);
		}
		setLoadingLocations(false);
	};

	// Sign out of Featurable
	const signOut = async () => {
		try {
			const response = await fetch(ajaxurl, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					action: "featurable_sign_out",
					nonce: featurableData.nonce,
				}),
			});

			if (response.ok) {
				const data = await response.json();
				if (data.success) {
					setIsLoggedIn(false);
					setWidgets([]);
					setAccounts([]);
					setLocations([]);
					setUser(null);

					createNotice("success", "You have been signed out successfully.", {
						isDismissible: true,
						type: "snackbar",
					});

					setUserModalOpen(false);
				}
			} else {
				throw new Error("Failed to sign out");
			}
		} catch (error) {
			createNotice("error", "An unexpected error occurred while signing out.", {
				isDismissible: true,
				type: "snackbar",
			});
		}
	};

	useEffect(() => {
		// Check authentication status
		checkAuthStatus().then((isLoggedIn) => {
			console.log("Auth status", isLoggedIn);
			if (isLoggedIn) {
				// Load user data
				loadData();
			}
		});
	}, []);

	useEffect(() => {
		if (isSaving) {
			saveWidget();

			const timerId = setTimeout(() => {
				console.log("Initializing via save");
				initializeWidget();
			}, 0);

			return () => clearTimeout(timerId);
		}
	}, [isSaving]);

	useEffect(() => {
		setAttributes({
			widgetConfig: JSON.stringify(widgetConfig),
			widgetLayout: widgetLayout,
		});

		initializeWidget();
	}, [widgetConfig, widgetLayout]);

	useEffect(() => {
		// Re-initialize Featurable widget when widgetId changes
		const timerId = setTimeout(() => {
			initializeWidget();
		}, 0);

		// Get widget data when widgetId changes
		getWidgetData();

		return () => clearTimeout(timerId);
	}, [widgetId]);

	useEffect(() => {
		if (isLoggedIn) {
			loadData();
		}
	}, [isLoggedIn]);

	useEffect(() => {
		const handleMessage = async (event) => {
			if (event.data.type === "FEATURABLE_AUTH_SUCCESS") {
				const token = event.data.token;
				if (!token) {
					alert(__("Authentication failed. Please try again.", TEXT_DOMAIN));
					return;
				}

				await handleLoginCallback(token);
				await checkAuthStatus();
				await loadData();
				await getWidgetData();

				if (authWindow) {
					authWindow.close();
				}
			}
		};

		window.addEventListener("message", handleMessage);
		return () => {
			window.removeEventListener("message", handleMessage);
		};
	}, [authWindow]);

	useEffect(() => {
		if (account) {
			listLocations();
		}
	}, [account]);

	const features = [
		__("Unlimited widgets", TEXT_DOMAIN),
		__("Remove Featurable branding", TEXT_DOMAIN),
		__("Pin reviews to the top", TEXT_DOMAIN),
		__("Add highlights to reviews", TEXT_DOMAIN),
		__("AI tools for increasing conversions", TEXT_DOMAIN),
	];

	return (
		<div {...useBlockProps()}>
			<InspectorControls>
				{loadingData && <p>{__("Loading data...", TEXT_DOMAIN)}</p>}

				{isLoggedIn ? (
					<>
						<Panel>
							<PanelBody>
								<div
									style={{
										display: "flex",
										justifyContent: "start",
										alignItems: "center",
									}}
								>
									<UserAvatar
										user={user}
										onClick={() => setUserModalOpen(true)}
										role="button"
										tabIndex={0}
										aria-label={__("Open My Account", TEXT_DOMAIN)}
									/>

									<div>
										<span
											style={{
												fontWeight: "bold",
											}}
										>
											{sanitize(user?.email)}
										</span>
										<span style={{ display: "flex", alignItems: "center" }}>
											<Icon
												icon={starFilled}
												style={{
													height: "20px",
													width: "20px",
													fill: "#3b82f6",
												}}
											/>
											{sprintf(
												__("%s Account", TEXT_DOMAIN),
												user?.upgraded
													? __("Pro", TEXT_DOMAIN)
													: __("Free", TEXT_DOMAIN),
											)}

											{!user?.upgraded && (
												<span>
													{" "}
													-{" "}
													<a
														href="https://featurable.com/account/upgrade"
														target="_blank"
													>
														{__("Upgrade to Pro", TEXT_DOMAIN)}
													</a>
												</span>
											)}
										</span>
									</div>
								</div>
							</PanelBody>
						</Panel>

						<Panel>
							<PanelBody title={__("Setup", TEXT_DOMAIN)} icon={plugins}>
								<p>
									{__(
										"Choose or create a new widget to get started. Visit your",
										TEXT_DOMAIN,
									)}{" "}
									<a href="https://featurable.com/app" target="_blank">
										{__("Featurable dashboard", TEXT_DOMAIN)}
									</a>{" "}
									{__(
										"for full customization options and more tools.",
										TEXT_DOMAIN,
									)}
								</p>

								{widgets.length > 0 ? (
									<>
										<SelectControl
											label={__("Choose Widget", TEXT_DOMAIN)}
											value={attributes.widgetId ?? ""}
											options={[
												{
													label: "Choose Widget",
													value: "",
													disabled: true,
												},
												...widgets.map((widget) => ({
												label: `${widget.locationDisplayName} | ${capitalize(
													widget.layout,
												)}`,
												value: widget.uid,
											}))]}
											onChange={(newWidgetId) => {
												console.log(newWidgetId);
												setAttributes({
													widgetId: newWidgetId,
												});
											}}
										/>
										<TextControl
											label={__("Widget ID", TEXT_DOMAIN)}
											value={attributes.widgetId}
											readOnly
											help={__(
												"The unique identifier for this widget.",
												TEXT_DOMAIN,
											)}
										/>
									</>
								) : (
									<div>
										<p>
											{__(
												"No widgets found. Create a new widget to get started.",
												TEXT_DOMAIN,
											)}
										</p>
									</div>
								)}

								<Button
									variant="secondary"
									onClick={() => setCreateWidgetModalOpen(true)}
									aria-label={__("Create New Widget", TEXT_DOMAIN)}
								>
									+ {__("New Widget", TEXT_DOMAIN)}
								</Button>

								{createWidgetModalOpen && (
									<Modal
										title={__("Create New Widget", TEXT_DOMAIN)}
										onRequestClose={() => setCreateWidgetModalOpen(false)}
									>
										{accounts.length === 0 && (
											<p>
												{__(
													"No Google accounts found. Please connect your Google account by",
													TEXT_DOMAIN,
												)}{" "}
												<a href="https://featurable.com/account/signin">
													{__("signing in", TEXT_DOMAIN)}
												</a>
												{__("and", TEXT_DOMAIN)}{" "}
												<strong>
													{__(
														"making sure to click the checkbox(es)",
														TEXT_DOMAIN,
													)}
												</strong>{" "}
												{__(
													"to allow access to your Google account.",
													TEXT_DOMAIN,
												)}
											</p>
										)}

										<SelectControl
											label={__("Choose Google Account", TEXT_DOMAIN)}
											defaultValue=""
											value={account || ""}
											options={[
												{
													label: __("Choose Google Account", TEXT_DOMAIN),
													value: "",
													disabled: true,
												},
												...accounts.map((account) => ({
													label: `${account.accountName}`,
													value: account.name,
												})),
											]}
											onChange={(newAccountName) => setAccount(newAccountName)}
										/>

										{locations.length === 0 ? (
											<SelectControl
												label={__("Choose Business Profile", TEXT_DOMAIN)}
												options={[
													{
														label: loadingLocations
															? __("Loading...", TEXT_DOMAIN)
															: __("Choose Google Account first", TEXT_DOMAIN),
														value: "",
													},
												]}
												disabled={true}
											/>
										) : (
											<SelectControl
												label={__("Choose Business Profile", TEXT_DOMAIN)}
												defaultValue={""}
												value={location || ""}
												options={[
													{
														label: __("Choose Business Profile", TEXT_DOMAIN),
														value: "",
														disabled: true,
													},
													...locations.map((location) => ({
														label: location.title,
														value: location.name,
													})),
												]}
												onChange={(newLocationName) =>
													setLocation(newLocationName)
												}
											/>
										)}

										<div
											style={{
												display: "flex",
												justifyContent: "end",
												alignItems: "center",
												marginTop: "16px",
											}}
										>
											<Button
												variant="secondary"
												onClick={() => setCreateWidgetModalOpen(false)}
												style={{ marginRight: "4px" }}
												aria-label={__("Cancel", TEXT_DOMAIN)}
											>
												{__("Cancel", TEXT_DOMAIN)}
											</Button>
											<Button
												disabled={!account || !location || loadingCreateWidget}
												variant="primary"
												onClick={handleCreateWidget}
												aria-label={__("Create Widget", TEXT_DOMAIN)}
											>
												{loadingCreateWidget
													? __("Loading...", TEXT_DOMAIN)
													: __("Create Widget", TEXT_DOMAIN)}
											</Button>
										</div>
									</Modal>
								)}
							</PanelBody>
						</Panel>

						{/* Widget Settings */}
						{attributes.widgetId && (
							<div>
								<Panel>
									<PanelBody
										title={__("Layout", TEXT_DOMAIN)}
										icon={category}
										initialOpen={false}
									>
										<SelectControl
											label={__("Layout Style", TEXT_DOMAIN)}
											value={widgetLayout}
											options={[
												{ label: __("Badge", TEXT_DOMAIN), value: "badge" },
												{
													label: __("Carousel", TEXT_DOMAIN),
													value: "carousel",
												},
												{ label: __("Grid", TEXT_DOMAIN), value: "grid" },
												{ label: __("List", TEXT_DOMAIN), value: "list" },
												{ label: __("Masonry", TEXT_DOMAIN), value: "masonry" },
												{ label: __("Slider", TEXT_DOMAIN), value: "slider" },
											]}
											onChange={(newLayout) => setWidgetLayout(newLayout)}
										/>

										{/* Carousel Settings */}
										{widgetLayout === "carousel" && (
											<>
												<CheckboxControl
													label={__("Autoplay", TEXT_DOMAIN)}
													help={__(
														"Automatically scroll through the reviews.",
														TEXT_DOMAIN,
													)}
													checked={widgetConfig.carouselAutoplay}
													onChange={(newCarouselAutoplay) => {
														setWidgetConfig({
															...widgetConfig,
															carouselAutoplay: newCarouselAutoplay,
														});
													}}
												/>

												<SelectControl
													label={__("Autoplay Speed (ms)", TEXT_DOMAIN)}
													help={__(
														"Time in milliseconds between each slide.",
														TEXT_DOMAIN,
													)}
													value={widgetConfig.carouselSpeed}
													onChange={(newCarouselSpeed) => {
														setWidgetConfig({
															...widgetConfig,
															carouselSpeed: parseInt(newCarouselSpeed),
														});
													}}
													options={[
														{ label: "500", value: 500 },
														{ label: "1000", value: 1000 },
														{ label: "2000", value: 2000 },
														{ label: "3000", value: 3000 },
														{ label: "5000", value: 5000 },
														{ label: "8000", value: 8000 },
														{ label: "12000", value: 12000 },
													]}
												/>
											</>
										)}

										{/* Slider Settings */}
										{widgetLayout === "slider" && (
											<>
												<CheckboxControl
													label={__("Autoplay", TEXT_DOMAIN)}
													help={__(
														"Automatically scroll through the reviews.",
														TEXT_DOMAIN,
													)}
													checked={widgetConfig.sliderAutoplay}
													onChange={(newSliderAutoplay) => {
														setWidgetConfig({
															...widgetConfig,
															sliderAutoplay: newSliderAutoplay,
														});
													}}
												/>
												<SelectControl
													label={__("Autoplay Speed (ms)", TEXT_DOMAIN)}
													help={__(
														"Time in milliseconds between each slide.",
														TEXT_DOMAIN,
													)}
													value={widgetConfig.sliderSpeed}
													onChange={(newSliderSpeed) => {
														setWidgetConfig({
															...widgetConfig,
															sliderSpeed: parseInt(newSliderSpeed),
														});
													}}
													options={[
														{ label: "500", value: 500 },
														{ label: "1000", value: 1000 },
														{ label: "2000", value: 2000 },
														{ label: "3000", value: 3000 },
														{ label: "5000", value: 5000 },
														{ label: "8000", value: 8000 },
														{ label: "12000", value: 12000 },
													]}
												/>
											</>
										)}

										{/* Badge Settings */}
										{widgetLayout === "badge" && (
											<>
												<CheckboxControl
													label={__("Floating Badge", TEXT_DOMAIN)}
													help={__(
														"Display the badge in the corner of the screen.",
														TEXT_DOMAIN,
													)}
													checked={widgetConfig.floating}
													onChange={(newFloating) => {
														setWidgetConfig({
															...widgetConfig,
															floating: newFloating,
														});
													}}
												/>

												<SelectControl
													label={__("Float Position", TEXT_DOMAIN)}
													value={widgetConfig.floatPosition}
													options={[
														{ label: __("Left", TEXT_DOMAIN), value: "left" },
														{ label: __("Right", TEXT_DOMAIN), value: "right" },
													]}
													onChange={(newFloatPosition) => {
														setWidgetConfig({
															...widgetConfig,
															floatPosition: newFloatPosition,
														});
													}}
												/>

												<CheckboxControl
													label={__("Dismissable", TEXT_DOMAIN)}
													help={__(
														"Let users close the floating badge.",
														TEXT_DOMAIN,
													)}
													checked={widgetConfig.dismissable}
													onChange={(newDismissable) => {
														setWidgetConfig({
															...widgetConfig,
															dismissable: newDismissable,
														});
													}}
												/>
											</>
										)}
									</PanelBody>
								</Panel>

								<Panel>
									<PanelBody
										title={__("Reviews", TEXT_DOMAIN)}
										icon={commentAuthorName}
										initialOpen={false}
									>
										<SelectControl
											label={__("Minimum Rating", TEXT_DOMAIN)}
											help={__(
												"Only show reviews with a rating of this value or higher.",
												TEXT_DOMAIN,
											)}
											options={[
												{
													label: sprintf(
														_n("%d star", "%d stars", 5, TEXT_DOMAIN),
														5,
													),
													value: 5,
												},
												{
													label: sprintf(
														_n("%d star", "%d stars", 4, TEXT_DOMAIN),
														4,
													),
													value: 4,
												},
												{
													label: sprintf(
														_n("%d star", "%d stars", 3, TEXT_DOMAIN),
														3,
													),
													value: 3,
												},
												{
													label: sprintf(
														_n("%d star", "%d stars", 2, TEXT_DOMAIN),
														2,
													),
													value: 2,
												},
												{
													label: sprintf(
														_n("%d star", "%d stars", 1, TEXT_DOMAIN),
														1,
													),
													value: 1,
												},
											]}
											value={widgetConfig.minStars}
											onChange={(newMinStars) => {
												setWidgetConfig({
													...widgetConfig,
													minStars: newMinStars,
												});
											}}
										/>

										<SelectControl
											label={__("Reviews Per Page", TEXT_DOMAIN)}
											help={__(
												"Maximum number of reviews to display per page.",
												TEXT_DOMAIN,
											)}
											options={Array.from(Array(10)).map((_, i) => ({
												label: `${i + 1}`,
												value: i + 1,
											}))}
											value={widgetConfig.pageSize}
											onChange={(newPageSize) => {
												setWidgetConfig({
													...widgetConfig,
													pageSize: newPageSize,
												});
											}}
										/>
									</PanelBody>
								</Panel>

								<Panel>
									<PanelBody
										title={__("Style", TEXT_DOMAIN)}
										icon={brush}
										initialOpen={false}
									>
										<SelectControl
											label={__("Review Card Style", TEXT_DOMAIN)}
											value={widgetConfig.reviewVariant}
											options={[
												{ label: __("Card", TEXT_DOMAIN), value: "card" },
												{
													label: __("Testimonial", TEXT_DOMAIN),
													value: "testimonial",
												},
											]}
											onChange={(newReviewVariant) => {
												setWidgetConfig({
													...widgetConfig,
													reviewVariant: newReviewVariant,
												});
											}}
										/>

										<SelectControl
											label={__("Review Theme", TEXT_DOMAIN)}
											value={widgetConfig.theme}
											options={[
												{ label: __("Dark", TEXT_DOMAIN), value: "dark" },
												{ label: __("Light", TEXT_DOMAIN), value: "light" },
											]}
											onChange={(newTheme) => {
												setWidgetConfig({
													...widgetConfig,
													theme: newTheme,
												});
											}}
										/>

										<SelectControl
											label={__("Date Display", TEXT_DOMAIN)}
											value={widgetConfig.dateDisplay}
											options={[
												{
													label: __("Time Since", TEXT_DOMAIN),
													value: "relative",
												},
												{
													label: __("Exact Date", TEXT_DOMAIN),
													value: "absolute",
												},
											]}
											onChange={(newDateDisplay) => {
												setWidgetConfig({
													...widgetConfig,
													dateDisplay: newDateDisplay,
												});
											}}
										/>
										<CheckboxControl
											label={__("Show Dates on Reviews", TEXT_DOMAIN)}
											help={__(
												"Whether to show or hide the date the review was posted.",
												TEXT_DOMAIN,
											)}
											checked={widgetConfig.dateDisplay !== "none"}
											onChange={(newDateDisplay) => {
												setWidgetConfig({
													...widgetConfig,
													dateDisplay: newDateDisplay ? "relative" : "none",
												});
											}}
										/>

										<SelectControl
											label={__("Name Display", TEXT_DOMAIN)}
											help={__(
												"How to display the name of the reviewer.",
												TEXT_DOMAIN,
											)}
											value={widgetConfig.nameDisplay}
											options={[
												{
													label: __("First Name Only", TEXT_DOMAIN),
													value: "firstNamesOnly",
												},
												{
													label: __("First Name + Last Initials", TEXT_DOMAIN),
													value: "firstAndLastInitials",
												},
												{
													label: __("Full Name", TEXT_DOMAIN),
													value: "fullNames",
												},
											]}
											onChange={(newNameDisplay) => {
												setWidgetConfig({
													...widgetConfig,
													nameDisplay: newNameDisplay,
												});
											}}
										/>

										<SelectControl
											label={__("Google Logo Style", TEXT_DOMAIN)}
											value={widgetConfig.logoVariant}
											options={[
												{ label: __("Icon", TEXT_DOMAIN), value: "icon" },
												{ label: __("Full", TEXT_DOMAIN), value: "full" },
												{ label: __("Hidden", TEXT_DOMAIN), value: "none" },
											]}
											onChange={(newLogoVariant) => {
												setWidgetConfig({
													...widgetConfig,
													logoVariant: newLogoVariant,
												});
											}}
										/>
									</PanelBody>
								</Panel>
								<Panel>
									<PanelBody
										title={__("Summary Bar", TEXT_DOMAIN)}
										icon={header}
										initialOpen={false}
									>
										<p>
											{__(
												"You can add a summary bar to the top of your widget to display average rating, total reviews, and link to your Google profile.",
												TEXT_DOMAIN,
											)}
										</p>

										<CheckboxControl
											checked={widgetConfig.summary}
											onChange={(newSummary) => {
												setWidgetConfig({
													...widgetConfig,
													summary: newSummary,
												});
											}}
											label={__("Show Summary Bar", TEXT_DOMAIN)}
										/>

										{widgetLayout === "list" && (
											<SelectControl
												label={__("Summary Position", TEXT_DOMAIN)}
												value={widgetConfig.summaryPosition}
												options={[
													{ label: __("Top", TEXT_DOMAIN), value: "top" },
													{ label: __("Left", TEXT_DOMAIN), value: "left" },
													{ label: __("Right", TEXT_DOMAIN), value: "right" },
												]}
												onChange={(newSummaryPosition) => {
													setWidgetConfig({
														...widgetConfig,
														summaryPosition: newSummaryPosition,
													});
												}}
											/>
										)}

										<CheckboxControl
											checked={widgetConfig.summaryReviewButton}
											onChange={(newSummaryReviewButton) => {
												setWidgetConfig({
													...widgetConfig,
													summaryReviewButton: newSummaryReviewButton,
												});
											}}
											label={__("Show Review Button", TEXT_DOMAIN)}
											help={__(
												"Show a button to leave a review on Google.",
												TEXT_DOMAIN,
											)}
										/>
									</PanelBody>
								</Panel>
								<Panel>
									<PanelBody
										title={__("Settings", TEXT_DOMAIN)}
										icon={cog}
										initialOpen={false}
									>
										<CheckboxControl
											checked={widgetConfig.schema}
											onChange={(newSchema) => {
												setWidgetConfig({
													...widgetConfig,
													schema: newSchema,
												});
											}}
											label={__("Enable Structured Data", TEXT_DOMAIN)}
											help={__(
												"Add JSON-LD structured data to your widget for enhanced SEO.",
												TEXT_DOMAIN,
											)}
										/>

										<Button
											variant="secondary"
											href="https://featurable.com/app"
											target="_blank"
											aria-label={__("Delete Widget", TEXT_DOMAIN)}
										>
											<Icon icon={trash} />
											{__("Delete Widget", TEXT_DOMAIN)}
										</Button>
									</PanelBody>
								</Panel>

								{!user?.upgraded && (
									<Panel>
										<PanelBody
											title={__("Upgrade", TEXT_DOMAIN)}
											initialOpen={true}
										>
											<p>
												{__(
													"Remove Featurable branding, unlock unlimited widgets, and more with Featurable Pro.",
													TEXT_DOMAIN,
												)}
											</p>
											<Button
												variant="primary"
												href="https://featurable.com/account/upgrade"
												target="_blank"
											>
												{__("Upgrade to Pro", TEXT_DOMAIN)}
											</Button>

											<Button
												style={{ marginTop: "16px", display: "block" }}
												variant="link"
												href="mailto:support@featurable.com"
												aria-label={__("Contact Support", TEXT_DOMAIN)}
											>
												{__("Support", TEXT_DOMAIN)}
											</Button>
										</PanelBody>
									</Panel>
								)}
							</div>
						)}
					</>
				) : (
					// Not logged in
					<Panel>
						<PanelBody title={__("Setup", TEXT_DOMAIN)} icon={plugins}>
							<p>
								{__(
									"Welcome to the Featurable Google Reviews widget! To get started, please login or create your free account by clicking the button below.",
									TEXT_DOMAIN,
								)}
							</p>
							<Button variant="primary" onClick={handleLogin}>
								{__("Login / Signup", TEXT_DOMAIN)}
							</Button>
						</PanelBody>
					</Panel>
				)}

				{/* User Modal */}
				{userModalOpen && (
					<Modal
						title={__("My Account", TEXT_DOMAIN)}
						onRequestClose={() => setUserModalOpen(false)}
					>
						<div
							style={{
								display: "flex",
								justifyContent: "start",
								alignItems: "center",
							}}
						>
							<UserAvatar user={user} />
							<div>
								<span
									style={{
										fontWeight: "bold",
									}}
								>
									{sanitize(user?.email)}
								</span>
								<span style={{ display: "flex", alignItems: "center" }}>
									<Icon
										icon={starFilled}
										style={{
											height: "20px",
											width: "20px",
											fill: "#3b82f6",
										}}
									/>
									{sprintf(
										__("%s Account", TEXT_DOMAIN),
										user?.upgraded
											? __("Pro", TEXT_DOMAIN)
											: __("Free", TEXT_DOMAIN),
									)}
									{!user?.upgraded && (
										<span>
											{" "}
											-{" "}
											<a
												href="https://featurable.com/account/upgrade"
												target="_blank"
											>
												{__("Upgrade to Pro", TEXT_DOMAIN)}
											</a>
										</span>
									)}
								</span>
							</div>
						</div>

						<p>
							{__(
								"You can manage your account, billing, and widgets from the Featurable dashboard.",
								TEXT_DOMAIN,
							)}
						</p>

						<div>
							<Button
								variant="primary"
								href="https://featurable.com/app"
								style={{
									marginRight: "8px",
								}}
							>
								{__("Go to Featurable Dashboard", TEXT_DOMAIN)} &rarr;
							</Button>
							<Button variant="secondary" onClick={signOut}>
								{__("Sign Out", TEXT_DOMAIN)}
							</Button>
						</div>
					</Modal>
				)}

				{/* Upgrade Modal */}
				{upgradeModalOpen && (
					<Modal
						title={__("Upgrade for Unlimited Access", TEXT_DOMAIN)}
						onRequestClose={() => setUpgradeModalOpen(false)}
					>
						<FeaturableIcon />

						<p
							style={{
								fontSize: "16px",
							}}
						>
							{upgradeModalMessage && (
								<strong>
									{upgradeModalMessage}
									<br />
								</strong>
							)}
							{__("Get", TEXT_DOMAIN)}{" "}
							<a href="https://featurable.com/pricing" target="_blank">
								{__("Featurable Pro", TEXT_DOMAIN)}
							</a>{" "}
							{__(
								"to unlock unlimited widgets, remove branding, and more!",
								TEXT_DOMAIN,
							)}
						</p>

						<ul>
							{features.map((feature) => {
								return (
									<li
										key={feature}
										style={{
											display: "flex",
											alignItems: "center",
											fontSize: "16px",
										}}
									>
										<Icon
											icon={check}
											style={{
												color: "#047857",
												backgroundColor: "#a7f3d0",
												height: "16px",
												width: "16px",
												marginRight: "6px",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												borderRadius: "100%",
											}}
										/>
										<span>{feature}</span>
									</li>
								);
							})}
						</ul>

						<div
							style={{
								display: "flex",
								justifyContent: "end",
								alignItems: "center",
								marginTop: "16px",
							}}
						>
							<Button
								variant="secondary"
								onClick={() => setUpgradeModalOpen(false)}
								style={{
									marginRight: "4px",
								}}
							>
								{__("Cancel", TEXT_DOMAIN)}
							</Button>
							<Button
								variant="primary"
								href="https://featurable.com/pricing"
								target="_blank"
							>
								{sprintf(
  __('Upgrade to Pro - %s / year', TEXT_DOMAIN),
  '$59'
)}
							</Button>
						</div>
					</Modal>
				)}
			</InspectorControls>

			{/* Render Widget */}
			<div
				ref={reviewsContainerRef}
				id={`featurable-${widgetId}`}
				data-featurable-async
			></div>
		</div>
	);
}
