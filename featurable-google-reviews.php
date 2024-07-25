<?php

/**
 * Plugin Name:       Featurable Google Reviews
 * Description:       Embed beautiful & customizable Google Reviews on your website
 * Requires at least: 5.3
 * Requires PHP:      7.0
 * Version:           1.0.0
 * Author:            Featurable
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       featurable-google-reviews
 *
 * @package CreateBlock
 */

if (!defined('ABSPATH')) {
	exit; // Exit if accessed directly.
}

// Constants
define('FEATURABLE_API_URL', set_url_scheme('https://featurable.com/api', 'https'));
define('FEATURABLE_ACCESS_TOKEN_OPTION', 'featurable_access_token');

// Check if the current WordPress version is compatible with the plugin
function featurable_google_reviews_version_check()
{
	global $wp_version;
	if (version_compare($wp_version, '5.3', '<')) {
		deactivate_plugins(plugin_basename(__FILE__));
		wp_die(
			array(
				'message' => __('This plugin requires WordPress version 5.3 or higher.', 'featurable-google-reviews'),
				'title' => __('Plugin Activation Error', 'featurable-google-reviews'),
				'link_url' => admin_url('plugins.php'),
				'link_text' => __('Back to Plugins', 'featurable-google-reviews')
			)
		);
	}
}
add_action('admin_init', 'featurable_google_reviews_version_check');

/**
 * Registers the block using the metadata loaded from the `block.json` file.
 * Behind the scenes, it registers also all assets so they can be enqueued
 * through the block editor in the corresponding context.
 *
 * @see https://developer.wordpress.org/reference/functions/register_block_type/
 */
function create_block_featurable_google_reviews_block_init()
{
	register_block_type(__DIR__ . '/build');

	// Enqueue the script for both editor and front-end
	add_action('admin_enqueue_scripts', 'featurable_google_reviews_enqueue_scripts');
	add_action('wp_enqueue_scripts', 'featurable_google_reviews_enqueue_scripts');
}
add_action('init', 'create_block_featurable_google_reviews_block_init');

// Enqueue the main Featurable script for rendering widgets
function featurable_google_reviews_enqueue_scripts()
{
	wp_enqueue_script(
		'featurable_google_reviews_bundle',
		'https://featurable.com/assets/wp-bundle.js',
		array(),
		'1.0.0',
		true
	);

	wp_localize_script('wp-blocks', 'featurableData', array(
		'nonce' => wp_create_nonce('featurable_nonce')
	));
}

// Add Featurable styles to the editor
function add_featurable_editor_styles()
{
	add_editor_style('https://featurable.com/assets/wp-styles.css');
}
add_action('admin_init', 'add_featurable_editor_styles');

// Utility function to check nonce
function check_nonce()
{
	if (!check_ajax_referer('featurable_nonce', 'nonce', false)) {
		wp_send_json_error(array(
			'message' => 'Invalid nonce',
			'key' => 'invalid_nonce',
		));
		return false;
	}
	return true;
}

// Function to exchange the one-time token for an access token
function exchange_token_with_featurable($one_time_token)
{
	$response = wp_remote_post(FEATURABLE_API_URL . '/v1/auth/wordpress', array(
		'body' => array('token' => $one_time_token)
	));

	if (is_wp_error($response)) {
		return false;
	}

	$body = wp_remote_retrieve_body($response);
	$data = json_decode($body, true);

	return isset($data['accessToken']) ? $data['accessToken'] : false;
}

// Endpoint to authenticate with Featurable
add_action('wp_ajax_featurable_auth_callback', 'featurable_auth_callback');
function featurable_auth_callback()
{
	if (!check_nonce()) {
		return;
	}

	// Admins only can authenticate with Featurable
	if (!current_user_can('manage_options')) {
		wp_send_json_error(array(
			'message' => 'Please login as an admin to sign in with Featurable',
			'key' => 'admin_only'
		), 403);
		return;
	}

	$one_time_token = sanitize_text_field($_POST['token']);
	$access_token = exchange_token_with_featurable($one_time_token);

	if (!$access_token) {
		wp_send_json_error(array(
			'message' => 'Failed to authenticate with Featurable',
			'key' => 'auth_failed'
		), 500);
		return;
	}

	update_option(FEATURABLE_ACCESS_TOKEN_OPTION, $access_token);

	wp_send_json_success(array(
		'message' => 'Authentication successful',
		'access_token' => $access_token
	));
	return;
}

// Endpoint to check if the user is authenticated with Featurable
add_action('wp_ajax_featurable_auth_check', 'featurable_auth_check');
function featurable_auth_check()
{
	if (!check_nonce()) {
		return;
	}

	$access_token = get_option(FEATURABLE_ACCESS_TOKEN_OPTION);

	if (!$access_token) {
		wp_send_json_error(array(
			'message' => 'Not authenticated with Featurable',
			'key' => 'not_authenticated',
		), 401);
		return;
	}

	$response = wp_remote_get(FEATURABLE_API_URL . '/v1/auth/me?wpKey=' . $access_token);

	if (is_wp_error($response)) {
		wp_send_json_error(array(
			'message' => 'Failed to authenticate with Featurable',
			'key' => 'auth_failed'
		), 500);
		return;
	}

	$response_body = wp_remote_retrieve_body($response);
	$data = json_decode($response_body, true);
	if ($data["success"] == false) {
		wp_send_json_error(array(
			'message' => $data['error']['message'],
			'key' => $data['error']['key']
		), $response['response']['code']);
		return;
	}

	wp_send_json_success(array(
		'message' => 'Authenticated with Featurable',
		'user' => $data['user'],
	), 200);
	return;
}

// Endpoint to list all the user widgets
add_action('wp_ajax_featurable_list_widgets', 'featurable_list_widgets');
function featurable_list_widgets()
{
	if (!check_nonce()) {
		return;
	}

	$access_token = get_option(FEATURABLE_ACCESS_TOKEN_OPTION);

	if (!$access_token) {
		wp_send_json_error(array(
			'message' => 'Not authenticated with Featurable',
			'key' => 'not_authenticated',
		), 401);
		return;
	}


	$response = wp_remote_get(FEATURABLE_API_URL . '/v1/widgets?wpKey=' . $access_token);

	if (is_wp_error($response)) {
		return false;
	}

	$response_body = wp_remote_retrieve_body($response);
	$data = json_decode($response_body, true);
	if ($data["success"] == false) {
		wp_send_json_error(array(
			'message' => 'Failed to fetch widgets',
			'key' => 'fetch_failed'
		), 500);
		return;
	}

	$widgets = $data["widgets"];

	wp_send_json_success(array(
		'message' => 'Widgets fetched successfully',
		'widgets' => $widgets
	), 200);
}

// Endpoint to load widgets and accounts data
add_action('wp_ajax_featurable_load_data', 'featurable_load_data');
function featurable_load_data()
{
	if (!check_nonce()) {
		return;
	}

	$access_token = get_option(FEATURABLE_ACCESS_TOKEN_OPTION);

	if (!$access_token) {
		wp_send_json_error(array(
			'message' => 'Not authenticated with Featurable',
			'key' => 'not_authenticated',
		), 401);
		return;
	}


	// List widgets
	$widgets_response = wp_remote_get(FEATURABLE_API_URL . '/v1/widgets?wpKey=' . $access_token);
	if (is_wp_error($widgets_response)) {
		wp_send_json_error(array(
			'message' => 'Failed to fetch widgets',
			'key' => 'fetch_failed'
		), 500);
		return;
	}
	$widgets_response_body = wp_remote_retrieve_body($widgets_response);
	$widgets_data = json_decode($widgets_response_body, true);
	if ($widgets_data["success"] == false) {
		wp_send_json_error(array(
			'message' => 'Failed to fetch widgets',
			'key' => 'fetch_failed'
		), 500);
		return;
	}

	// List accounts
	$accounts_response = wp_remote_get(FEATURABLE_API_URL . '/v1/accounts?wpKey=' . $access_token);
	if (is_wp_error($accounts_response)) {
		wp_send_json_error(array(
			'message' => 'Failed to fetch accounts',
			'key' => 'fetch_failed'
		), 500);
		return;
	}
	$accounts_response_body = wp_remote_retrieve_body($accounts_response);
	$accounts_data = json_decode($accounts_response_body, true);
	if ($accounts_data["success"] == false) {
		wp_send_json_error(array(
			'message' => 'Failed to fetch accounts',
			'key' => 'fetch_failed'
		), 500);
		return;
	}

	$widgets = $widgets_data["widgets"];
	$accounts = $accounts_data["accounts"];

	wp_send_json_success(array(
		"widgets" => $widgets,
		"accounts" => $accounts,
	), 200);
}

// Endpoint to create a new widget
add_action('wp_ajax_featurable_create_widget', 'featurable_create_widget');
function featurable_create_widget()
{
	if (!check_nonce()) {
		return;
	}

	// Admins only can create widgets
	if (!current_user_can('manage_options')) {
		wp_send_json_error(array(
			'message' => 'Please login as an admin to create widgets',
			'key' => 'admin_only'
		), 403);
		return;
	}

	$access_token = get_option(FEATURABLE_ACCESS_TOKEN_OPTION);

	if (!$access_token) {
		wp_send_json_error(array(
			'message' => 'Not authenticated with Featurable',
			'key' => 'not_authenticated',
		), 401);
		return;
	}

	$account = $_POST['account'];
	$location = $_POST['location'];


	$response = wp_remote_post(FEATURABLE_API_URL . '/v1/widgets?wpKey=' . $access_token, array(
		'body' => array(
			'accountName' => $account,
			'locationName' => $location,
			'layout' => 'carousel',
			'config' => array(
				'theme' => 'light'
			)
		)
	));
	if (is_wp_error($response)) {
		wp_send_json_error(array(
			'message' => 'Failed to create widget',
			'key' => 'create_failed'
		), 500);
		return;
	}
	$response_body = wp_remote_retrieve_body($response);
	$data = json_decode($response_body, true);
	if ($data["success"] == false) {
		wp_send_json_error(array(
			'message' => $data["error"]["message"],
			'key' => $data["error"]["key"]
		), $response["response"]["code"]);
		return;
	}

	$widget_uid = $data["key"];

	wp_send_json_success(array(
		'message' => 'Widget created successfully',
		'widget_uid' => $widget_uid
	), 201);
}

// Endpoint to list all the user widgets
add_action('wp_ajax_featurable_list_locations', 'featurable_list_locations');
function featurable_list_locations()
{
	if (!check_nonce()) {
		return;
	}

	$access_token = get_option(FEATURABLE_ACCESS_TOKEN_OPTION);

	if (!$access_token) {
		wp_send_json_error(array(
			'message' => 'Not authenticated with Featurable',
			'key' => 'not_authenticated',
		), 401);
		return;
	}

	$account_name = $_POST['accountName'];
	if (!$account_name) {
		wp_send_json_error(array(
			'message' => 'Account name is required',
			'key' => 'account_name_required'
		), 400);
		return;
	}


	$response = wp_remote_post(FEATURABLE_API_URL . '/v1/locations?wpKey=' . $access_token, array(
		'body' => array(
			'accountName' => $account_name
		)
	));

	if (is_wp_error($response)) {
		wp_send_json_error(array(
			'message' => 'Failed to fetch locations',
			'key' => 'fetch_failed'
		), 500);
		return;
	}

	$response_body = wp_remote_retrieve_body($response);
	$data = json_decode($response_body, true);
	if ($data["success"] == false) {
		wp_send_json_error(array(
			'message' => 'Failed to fetch locations',
			'key' => 'fetch_failed'
		), 500);
		return;
	}

	$locations = $data["locations"];

	wp_send_json_success(array(
		'locations' => $locations
	), 200);
}

// Endpoint to get widget data
add_action('wp_ajax_featurable_get_widget_data', 'featurable_get_widget_data');
function featurable_get_widget_data()
{
	if (!check_nonce()) {
		return;
	}

	$access_token = get_option(FEATURABLE_ACCESS_TOKEN_OPTION);

	if (!$access_token) {
		wp_send_json_error(array(
			'message' => 'Not authenticated with Featurable',
			'key' => 'not_authenticated',
		), 401);
		return;
	}

	$widget_id = $_POST['widgetId'];
	if (!$widget_id) {
		wp_send_json_error(array(
			'message' => 'Widget ID is required',
			'key' => 'widget_id_required',
		), 400);
		return;
	}


	$response = wp_remote_get(FEATURABLE_API_URL . '/v1/widgets/' . $widget_id . '?wpKey=' . $access_token);

	if (is_wp_error($response)) {
		wp_send_json_error(array(
			'message' => 'Failed to fetch widget data',
			'key' => 'fetch_failed',
		), 500);
		return;
	}

	$response_body = wp_remote_retrieve_body($response);
	$data = json_decode($response_body, true);
	if ($data["success"] == false) {
		wp_send_json_error(array(
			'message' => 'Failed to fetch widget data',
			'key' => 'fetch_failed',
		), 500);
		return;
	}

	wp_send_json_success($data, 200);
}

// Endpoint to save widget data
add_action('wp_ajax_featurable_save_widget', 'featurable_save_widget');
function featurable_save_widget()
{
	if (!check_nonce()) {
		return;
	}

	// Admins only can update widgets
	if (!current_user_can('manage_options')) {
		wp_send_json_error(array(
			'message' => 'Please login as an admin to update widgets',
			'key' => 'admin_only'
		), 403);
		return;
	}

	$access_token = get_option(FEATURABLE_ACCESS_TOKEN_OPTION);

	if (!$access_token) {
		wp_send_json_error(array(
			'message' => 'Not authenticated with Featurable',
			'key' => 'not_authenticated',
		), 401);
		return;
	}


	$widget_id = $_POST['widgetId'];
	if (!$widget_id) {
		wp_send_json_error(array(
			'message' => 'Widget ID is required',
			'key' => 'widget_id_required',
		), 400);
		return;
	}

	$widget_config = $_POST['widgetConfig'];
	if (!$widget_config) {
		wp_send_json_error(array(
			'message' => 'Widget config is required',
			'key' => 'widget_config_required',
		), 400);
		return;
	}
	$widget_config = json_decode(stripslashes($_POST['widgetConfig']), true);

	$widget_layout = $_POST['widgetLayout'];
	if (!$widget_layout) {
		wp_send_json_error(array(
			'message' => 'Widget layout is required',
			'key' => 'widget_layout_required',
		), 400);
		return;
	}


	$response = wp_remote_post(FEATURABLE_API_URL . '/v1/widgets/' . $widget_id . '?wpKey=' . $access_token, array(
		'headers' => array(
			'Content-Type' => 'application/json',
		),
		'body' => wp_json_encode(array(
			'layout' => $widget_layout,
			'config' => $widget_config,
		)),
	));

	if (is_wp_error($response)) {
		wp_send_json_error(array(
			'message' => 'Failed to save widget data',
			'key' => 'save_failed',
		), 500);
		return;
	}

	$response_body = wp_remote_retrieve_body($response);
	$data = json_decode($response_body, true);
	if ($data["success"] == false) {
		wp_send_json_error(array(
			'message' => 'Failed to save widget data',
			'key' => 'save_failed',
		), 500);
		return;
	}

	wp_send_json_success($data, 200);
}

// Endpoint to sign out
add_action('wp_ajax_featurable_sign_out', 'featurable_sign_out');
function featurable_sign_out()
{
	if (!check_nonce()) {
		return;
	}

	// Admin only can sign out
	if (!current_user_can('manage_options')) {
		wp_send_json_error(array(
			'message' => 'Please login as an admin to sign out',
			'key' => 'admin_only'
		), 403);
		return;
	}

	$access_token = get_option(FEATURABLE_ACCESS_TOKEN_OPTION);

	if (!$access_token) {
		wp_send_json_error(array(
			'message' => 'Not authenticated with Featurable',
			'key' => 'not_authenticated',
		), 401);
		return;
	}

	delete_option(FEATURABLE_ACCESS_TOKEN_OPTION);

	wp_send_json_success(array(
		'message' => "Signed out successfully",
	), 200);
}
