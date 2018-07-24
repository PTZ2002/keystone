import Field from '../Field';
import React, { PropTypes } from 'react';
import { findDOMNode } from 'react-dom';
import { FormInput, FormSelect, Button } from 'elemental';
import ConfirmationDialog from './../../../admin/client/App/shared/ConfirmationDialog';

import { Editor } from 'react-draft-wysiwyg';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';

import styles from './CTstyle.css';
import { Flex, Item } from 'react-flex';
import 'react-flex/index.css';
import cs from 'classnames';

import TinyMce from 'react-tinymce';
import $script from 'scriptjs';
import nesProp from 'nested-property';

import ListComposer from './ListComposer';
import TabRow from './TabRow';

/**
 * This function will insert a value to the begining of the array if not exist with the same value
 * (there are no return value because the array is given by address).
 * @param {Object} intoThisArray - this is an object contains the array on "values" property. That array
 * are elements type object like this: {value:<String>, label:<String>}
 * @param {Object} newValue
 */
const unshifValueIfNotExist = (intoThisArray, newValue) => {
	if( intoThisArray && intoThisArray.values && Array.isArray(intoThisArray.values) &&
		intoThisArray.values.filter(i=>(i.value === '')).length < 1 ) {
		intoThisArray.values.unshift(newValue);
	}
};

let editorLoaded = !!global.tinymce;
let theSubjectEditor, theBodyEditor;
const TARGET_BODY = 'body', TARGET_SUBJECT = 'subject', TARGET_VARS = 'variables', INDEPENDENTS = 'independents',
	TARGET_INDEXTYPE = 'indextype';
const targetWhiteList = [TARGET_BODY, TARGET_SUBJECT, TARGET_VARS];

module.exports = Field.create({
	displayName: 'Custom Type',
	/* propTypes: {
		formatString: React.PropTypes.object,
	}, */
	statics: {
		type: 'CT',
	},

	// focusTargetRef: 'customEditor', // TODO set focused the first input. Give a ref for it

	loadEditor () {
		$script(`${Keystone.adminPath}/lib/tinymce/tinymce.min.js`, () => {
			this.setState({ editorLoaded: true });
		});
	},
	componentDidMount () {
		if (!this.state.editorLoaded) {
			this.loadEditor();
		}
	},
	/**
	 * We have to reset the references because the editors will reinitialize on mount.
	 */
	componentWillUnmount () {
		theSubjectEditor = null;
		theBodyEditor = null;
	},

	//	mixins: [ListComposer],

	/**
	 * When start the module we configure the initial state for everithing.
	 */
	getInitialState() {
		let valueOfState = typeof this.props.values == 'object' && this.props.values.templateContent ?
		this.props.values.templateContent : '{}';

		try { valueOfState = JSON.parse( valueOfState ); }
		catch (e) {
			valueOfState = {}; // do nothig, because wrong or deprecated record. We will save a fresh one when save.
		}

		let module = '';
		if ( !Array.isArray(valueOfState) && typeof valueOfState == 'object' ) {
			module = valueOfState.module || '';
		}

		let allRecipients = this.props && this.props.options && this.props.options.recipients || {values:[]};
		unshifValueIfNotExist(allRecipients, {value:'', label: 'Please select recipient'});

		let allModules = this.props && this.props.options && this.props.options.modules || {values:[]};
		unshifValueIfNotExist(allModules, {value:'', label: 'Please select module'});

		let allLanguages = this.props && this.props.options && this.props.options.languages || {values:[]};

		let moduleRelatedVariables = this.getVariablesListByModuleName(module || '');
		let allVariables = this.props && this.props.options && this.props.options.variables &&
			{...this.props.options.variables, ...moduleRelatedVariables}
		|| {values:[]};

		const currentTabRecipient = valueOfState && valueOfState.recipients &&
			Array.isArray(valueOfState.recipients) && valueOfState.recipients.length > 0 &&
			valueOfState.recipients[0] || {value: ''};

		const currentTabLang = allLanguages && allLanguages.values &&
			Array.isArray(allLanguages.values) && allLanguages.values.length > 0 &&
			allLanguages.values[0] || {value: ''};

		return {
			currentTabRecipient: currentTabRecipient,
			currentTabLang: currentTabLang,
			value: valueOfState,
			allRecipients: allRecipients,
			allModules: allModules,
			allLanguages: allLanguages,
			allVariables: allVariables,
			confirmationDialog: null,
			editorLoaded,
		};
	},

	componentWillReceiveProps: function (nextProps) {
		/* if (JSON.stringify(nextProps.value) !== JSON.stringify(this.state.value)) {
			this.setState({
				value: nextProps.value,
			});
		} */
	},

	getDefaultProps () {
		return {
			/* ...this.props, // not exist yet
			...{options: {
				...this.props.options,
				...{modules: this.props.options.modules + [{value:'', label: 'AAAAAAAAAAAa'}]}
			}} */
		};
	},

	/**
	 * Find a tab to set active. Not done actually.
	 */
	onTabRemainsSetThatActive() {
		if (!this.state.value || !this.state.value.recipients || this.state.value.recipients.length < 1) {
			this.onTabRecipeintSet(null);
			return;
		}

		const {currentTabRecipient} = this.state;
		let selectedFound = false;
		this.state.value.recipients.forEach((oneRecipient)=>{
			selectedFound = selectedFound || oneRecipient.value === currentTabRecipient.value;
		});

		if (!selectedFound) {
			this.onTabRecipeintSet(this.state.value.recipients[0].value);
		}
	},

	/**
	 * Removed recipients related data have to be removed from memory.
	 */
	onTabClearDataOfDeletedTabs() {
		// if no content then nothing to clear. Terminating this methode.
		if (!this.state.value.content || Object.keys(this.state.value.content).length < 1) { return; }

		const selectedRecips = this.state.value.recipients;
		const allRecips = this.state.allRecipients && this.state.allRecipients.values || [];
		// no recipients declared in schema, or the path of this values misspeld in schema.
		if (!allRecips || !Array.isArray(allRecips) || allRecips.length < 1) { return; }

		// erase all value from content if there are no selected recipients.
		if (!selectedRecips || !Array.isArray(selectedRecips) || selectedRecips.length < 1) {
			Object.keys(this.state.value.content).forEach((key) => { delete this.state.value.content[key]; });
			return; // everithing is cleared. Nothing to do more.
		}

		let foundInSelected = false; // we need a flag for detecting the unused recipients.
		allRecips.forEach((oneOfAll)=>{
			foundInSelected = false; // reset flag to false
			selectedRecips.forEach((oneOfSelected)=>{
				foundInSelected = foundInSelected || oneOfSelected.value === oneOfAll.value;
			});
			if (!foundInSelected && oneOfAll.value !== '' && !!this.state.value.content[oneOfAll.value]) {
				delete this.state.value.content[oneOfAll.value]; // unused recipient data ins tate, so remove that
			}
		});
	},

	/**
	 * Save the email contents to the correct "coordinates" of recipients and languages
	 * @param {object} e - the event object of the editors onchange
	 */
	onEditorStateChange({value, nameOfTarget}) {
		// preparing initial values from state to save the editors value
		const content = this.state.value.content || {};
		const {currentTabRecipient, currentTabLang} = this.state;

		// finding indexes to save the editors contents, on each language and recipent intersects
		const recipientIndex = currentTabRecipient && currentTabRecipient.value || false;
		const languageIndex = currentTabLang && currentTabLang.value || false;

		// we have no valid conditions tyo save the editors value!!!
		if( !currentTabRecipient || !currentTabLang || !nameOfTarget ||
			targetWhiteList.indexOf(nameOfTarget) === -1 ) {
			return false;
		}

		// make sure if exists and is an object
		content[recipientIndex] = content[recipientIndex] ? content[recipientIndex] : {};
		content[recipientIndex][languageIndex] = content[recipientIndex][languageIndex] ? content[recipientIndex][languageIndex] : {};
		content[recipientIndex][languageIndex][nameOfTarget] = value;

		// update value in the current state of component.
		this.setState({
			value: {
				...this.state.value,
				...{content: content}
			}
		});

		// update value in the props for store in the store. Support value for keystone.
		this.props.onChange({
			path: this.props.path,
			value: {
				...this.state.value,
				...{content: content}
			}
		});
	},

	/**
	 * Update the full content of the wysiwyg editor, used selected tabs.
	 */
	updateValuesInEditorOnChangeSomething() {
		const subject = this.fetchSafeEditorValue({nameOfTarget: TARGET_SUBJECT});
		this.setContentToSubject(subject);
		const body = this.fetchSafeEditorValue({nameOfTarget: TARGET_BODY});
		this.setContentToBody(body);
	},

	/**
	 * Event handling for recipient tab change. Convert sting value to an object and save it in the state.
	 * @param {*} tabName
	 */
	onTabRecipeintSet(tabName) {
		this.setState({
			currentTabRecipient: {value: tabName}
		}, () => {
			this.updateValuesInEditorOnChangeSomething();
		});
	},

	/**
	 * Event handling for lang tab change. Convert sting value to an object and save it in the state.
	 * @param {*} tabName
	 */
	onTabLangSet(tabName) {
		this.setState({
			currentTabLang: {value: tabName}
		}, () => {
			this.updateValuesInEditorOnChangeSomething();
		});
	},

	/**
	 * Update in props a changed value to provide it for keystone.
	 * @param {object} changedProp
	 */
	updateValue (changedProp) {
		this.props.onChange({ ...this.props.value, ...changedProp });
	},

	/**
	 * This function will refresh the used variable list for editors.
	 * @param {string} moduleName - this is the module wath help us to filter the usable variables.
	 */
	getVariablesListByModuleName( moduleName ) {
		let newVariables = {values:[]};
		let allVariables = this.props && this.props.options && this.props.options.variables || {values:[]};

		if( allVariables && allVariables.values && Array.isArray(allVariables.values) &&
			allVariables.values.length > 0 ) {
			newVariables.values = allVariables.values.filter((item) => {
				return ( item.moduleWhiteList && Array.isArray(item.moduleWhiteList) && item.moduleWhiteList.length > 0 &&
					item.moduleWhiteList.indexOf( moduleName ) !== -1 )
				}
			).map((item)=>{
				return {
					value: item.value,
					label: item.label,
					moduleWhiteList: item.moduleWhiteList || [],
				}
			});
		}
		unshifValueIfNotExist(newVariables, {value:'', label: 'Please select variable'});

		return newVariables;
	},

	/**
	 * This function filter the restricted variables be the selected module.
	 */
	cleanUpAllOfTheSelectedEntitiesByModule() {
		const varsWhiteList = this.state.value.allVariables && this.state.value.allVariables.values || [];
		const allLanguages = this.state.allLanguages || false;
		const content = this.state.value.content || false;
		// targetWhiteList

		const {recipients} = this.state.value;
		let newContent = {};
		let route = '';

		// save only the module related values, others will erased
		if(recipients && Array.isArray(recipients) && recipients.length > 0) {
			recipients.forEach((rec)=>{
				// Save language affected values
				if(allLanguages && Array.isArray(allLanguages) && allLanguages.length > 0) {
					allLanguages.forEach((lng)=>{
						route = [rec.value, lng.value, TARGET_BODY].join('.');
						nesProp.set(newContent, route, nesProp.get(content, route));

						route = [rec.value, lng.value, TARGET_SUBJECT].join('.');
						nesProp.set(newContent, route, nesProp.get(content, route));
					});
				}

				// Filter the varsWhiteList variables
				let oldVariables = nesProp.get(content, route), newVariables = [];
				if (varsWhiteList && Array.isArray(varsWhiteList) && varsWhiteList.length > 0) {
					varsWhiteList.forEach((whiteVar)=>{
						oldVariables.forEach((oldVar)=>{
							if (whiteVar.value == oldVar.value) {
								newVariables.push({
									value: oldVar.value,
									label: oldVar.label
								});
							}
						});
					});
				}

				// Save independent values
				route = [rec.value, INDEPENDENTS, TARGET_VARS].join('.');
				nesProp.set(newContent, route, newVariables);

				route = [rec.value, INDEPENDENTS, TARGET_INDEXTYPE].join('.');
				nesProp.set(newContent, route, nesProp.get(content, route));
			});
		}

		// update value in the current state of component.
		this.setState({
			value: {
				...this.state.value,
				...{content: newContent}
			}
		});

		// update value in the props for store in the store. Support value for keystone.
		this.props.onChange({
			path: this.props.path,
			value: {
				...this.state.value,
				...{content: newContent}
			}
		});
	},

	/**
	 * Open a confirmation dialog for confirm the reset.
	 * @param {*} handleReset
	 */
	confirmReset (module) {
		// if we make a switch from nothing to something, we don't need confirmation dialog yet
		if ( _.isEmpty(this.state.value.module) ) {

			return this.selectModule(module);
		}

		const confirmationDialog = (
			<ConfirmationDialog
				isOpen
				body={<p>If you want to change the affected module you will lose your changes. Are you sure?</p>}
				confirmationLabel="Change module"
				onCancel={()=>{
					this.removeConfirmationDialog();
				}}
				onConfirmation={()=>{
					this.selectModule(module);
					this.removeConfirmationDialog();
				}}
			/>
		);
		this.setState({ confirmationDialog });
	},

	/**
	 * Remove confirmation dialog
	 */
	removeConfirmationDialog () {
		this.setState({
			confirmationDialog: null,
		});
	},

	/**
	 * Update module selector value in state and trigger update also for the props.
	 * @param {*} module
	 */
	selectModule(module) {
		this.setState({
			value: { ...this.state.value, ...{module: module}},
		},() => {
			this.setState({
				allVariables: this.getVariablesListByModuleName(module),
			}, () => {
				this.cleanUpAllOfTheSelectedEntitiesByModule();
				this.setContentToSubject('');
				this.setContentToBody('');
				// this.forceUpdate();
			});
		});

		this.updateValue({ module });
	},

	/**
	 * Rendering module selector
	 */
	renderModuleSelector() {
		const modules = this.state.allModules;
		const { module } = this.state.value || {module: ''};
		const selected = modules && modules.values && modules.values.filter(i => i.value === module)[0];
		return (
			<FormSelect
				// prependEmptyOption={true}
				onChange={this.confirmReset}
				options={modules && modules.values || []}
				value={selected && selected.value}
			/>
		);
	},

	/**
	 * Update recipient list in the state and find another active tab if the removed one was the active.
	 */
	onChangeRecipients(values) {
		this.setState({
			value: { ...this.state.value, ...{recipients: values}}
		}, () => {
			this.onTabRemainsSetThatActive();
			this.onTabClearDataOfDeletedTabs();
		});
	},

	changeVariables(vars) {
		const { currentTabRecipient } = this.state;
		const rec = currentTabRecipient.value || '';
		let routeOfVariables = ['value', 'content', rec, INDEPENDENTS, TARGET_VARS].join('.');

		// TODO do test, lot of tests, verify if we don't need to copy it
		let newVars = vars;
		nesProp.set(this.state, routeOfVariables, newVars);

		this.setState({
			value: {
				...this.state.value
			}
		});
	},

	/**
	 * Render the part of variable selector
	 */
	renderVariableSelector() {
		const areVariabels = this.state.allVariables && this.state.allVariables.values &&
			this.state.allVariables.values.length > 0 &&
			this.state.allVariables.values.filter((elem)=>(elem.value !== '')).length > 0 || false;
		const selectedVariablesByTabs = this.fetchSafeEditorValue({nameOfTarget: TARGET_VARS});

		return (
			<Flex column flex={1} alignItems="stretch" key={"recipientSelectorKey"}>
				<Flex column alignItems="start">
					<Flex row>
						<span className={styles.fieldTitle}>{"Variables"}</span>
					</Flex>
					<Flex row>
						{areVariabels ?
							(<span className={styles.fieldLabel}>{"Please select variables for this template."}</span>) :
							(<span className={styles.fieldLabel}>{"No variables slotted for this module."}</span>)
						}
					</Flex>
				</Flex>
				<ListComposer
					className={cs(styles.variableComposer, (!areVariabels ? styles.visibleNone : null))}
					allValues={this.state.allVariables}
					allSelected={selectedVariablesByTabs}
					onChange={(value) => this.changeVariables(value)}
				/>
			</Flex>
		);
	},

	/**
	 * Separate function for insert contetnt to editor by clicking. This was made because on the timeline
	 * of element creation the editor reference created after the variable buttons, and the attached clickhandler.
	 * But this function is given by referenc to onclick handler, and this make possible to call this when ewe have
	 * value in the editor reference variable.
	 * @param {*} ev
	 * @param {*} value
	 */
	insertContentToSubject(ev, value) {
		theSubjectEditor && theSubjectEditor.insertContent('{{'+value+'}}');
	},

	/**
	 * Separate function for insert contetnt to editor by clicking.
	 * @param {*} ev
	 * @param {*} value
	 */
	insertContentToBody(ev, value) {
		theBodyEditor && theBodyEditor.insertContent('{{'+value+'}}');
	},

	/**
	 * Separate function for set contetnt to editor by clicking.
	 * @param {*} ev
	 * @param {*} value
	 */
	setContentToSubject(value) {
		theSubjectEditor && theSubjectEditor.setContent(value);
	},

	/**
	 * Separate function for set contetnt to editor by clicking.
	 * @param {*} ev
	 * @param {*} value
	 */
	setContentToBody(value) {
		theBodyEditor && theBodyEditor.setContent(value);
	},

	/**
	 * This function will render a row of buttons to use for filling an editor.
	 */
	renderButtonRowForFillContent(functionForClick) {
		const selectedVariablesByTabs = this.fetchSafeEditorValue({nameOfTarget: TARGET_VARS});

		return (
			<Flex column flex={1} alignItems="stretch">
				<Flex row alignItems="stretch" flex={1} key={"buttonRow"}>
				{selectedVariablesByTabs && selectedVariablesByTabs.map((piece, index) => (
					<Flex column alignItems="start" key={"buttonRowElem"+index}
						className={cs(styles.variableValueInserter, styles.noselect)}
						onClick={(ev) => functionForClick(ev, piece.value)}
					>
						<Flex row>
							<Flex column>
								{piece.label}
							</Flex>
							<Flex column>
								<span className={cs("octicon", "octicon-tag", styles.downArrowIcon)}/>
							</Flex>
						</Flex>
					</Flex>
				))}
				</Flex>
			</Flex>
		);
	},

	/**
	 * This function know of type of default values in the master content object by
	 * name of the section (variables, body subject ...).
	 */
	getDefaultValueByNameOfTargetForContent(nameOfTarget) {
		switch(nameOfTarget) {
			case TARGET_VARS: return []; break;
			case TARGET_SUBJECT:
			case TARGET_BODY: return ''; break;
			default: return null;
		}
		return null;
	},

	/**
	 * Gettin value from state to the current combination of the recipient, language and template part.
	 * This is neccessary for galvanic isolation of values addresses
	 * @param {*} param0
	 */
	fetchSafeEditorValue({nameOfTarget}) {
		const content = this.state.value.content || {};
		const { currentTabRecipient, currentTabLang } = this.state;
		const curRecValue = currentTabRecipient.value || false;
		const curLangValue = currentTabLang.value || false;

		// default value by name of target
		let editorState = this.getDefaultValueByNameOfTargetForContent(nameOfTarget);

		// we have no valid conditions tyo save the editors value!!!
		if( !curRecValue || !curLangValue || !nameOfTarget ||
			targetWhiteList.indexOf(nameOfTarget) === -1 ) {
			return editorState;
		}

		let route = [ curRecValue, curLangValue, nameOfTarget].join('.');
		if ( nameOfTarget == TARGET_VARS || nameOfTarget == TARGET_INDEXTYPE ) {
			route = [ curRecValue, INDEPENDENTS, nameOfTarget].join('.');
		}

		// Get the value or give a default empty value (like a string or array)
		editorState = nesProp.get(content, route) || this.getDefaultValueByNameOfTargetForContent(nameOfTarget);

		return editorState;
	},

	/**
	 * Rendering the subject editor of template
	 */
	renderSubjectEditor() {
		const editorState = this.fetchSafeEditorValue({nameOfTarget: TARGET_SUBJECT});

		return (
			<div>
				<Flex column alignItems="start">
					<Flex row>
						<span className={styles.fieldTitle}>{"Email subject"}</span>
					</Flex>
					<Flex row>
						<span className={styles.fieldLabel}>{"Edit subject of the email template."}</span>
					</Flex>
				</Flex>

				{this.renderButtonRowForFillContent(this.insertContentToSubject)}
				<TinyMce
					ref="customEditor"
					onChange={(e) => this.onEditorStateChange({value: e.target.getContent(), nameOfTarget: "subject"})}
					config={{
						menubar: false,
						statusbar: false,
						height : 40,
						min_height: 40,
						toolbar: 'undo redo',
						forced_root_block: '',
						formats: {
							removeformat: [
							  {selector: '*', remove : 'all', split : true, expand : true, block_expand: true, deep : true},
							]
						},
						entity_encoding : "raw",
						extended_valid_elements: '',
						setup: (editor) => {
							theSubjectEditor = !theSubjectEditor ? editor : theSubjectEditor;
						}
					}}
					content={editorState}
				/>
			</div>
		);
	},

	/**
	 * Rendering the emailbody editor of template
	 */
	renderBodyEditor() {
		const editorState = this.fetchSafeEditorValue({nameOfTarget: TARGET_BODY});

		return (
			<div>

				<Flex column alignItems="start">
					<Flex row>
						<span className={styles.fieldTitle}>{"Email body"}</span>
					</Flex>
					<Flex row>
						<span className={styles.fieldLabel}>{"Edit body of the email template."}</span>
					</Flex>
				</Flex>

				{this.renderButtonRowForFillContent(this.insertContentToBody)}
				<TinyMce
					ref="customEditor2"
					onChange={(e) => this.onEditorStateChange({value: e.target.getContent(), nameOfTarget: "body"})}
					config={{
						menubar: false,
						statusbar: false,
						height : 200,
						toolbar: 'undo redo | bold italic underline strikethrough | alignleft aligncenter alignright | styleselect',
						setup: (editor) => {
							theBodyEditor = !theBodyEditor ? editor : theBodyEditor;
						}
					}}
					content={editorState}
				/>
			</div>
		)
	},

	changeIndexType(type, lowValue) {
		const { currentTabRecipient } = this.state;
		const rec = currentTabRecipient.value || '';
		let routeOfType = ['value', 'content', rec, INDEPENDENTS, TARGET_INDEXTYPE, 'type'].join('.');
		let routeOfLowValue = ['value', 'content', rec, INDEPENDENTS, TARGET_INDEXTYPE, 'lowValue'].join('.');

		let newIT = {
			type: type === null ? nesProp.get(this.state, routeOfType) || '' : type,
			lowValue: lowValue === null ? nesProp.get(this.state, routeOfLowValue) || '' : lowValue
		}

		let routeOfIndexType = ['value', 'content', rec, INDEPENDENTS, TARGET_INDEXTYPE].join('.');
		let newValue = {};
		nesProp.set(this.state, routeOfIndexType, newIT);

		this.setState({
			value: {
				...this.state.value
			}
		});
	},

	/**
	 * This will render the indextype fields
	 */
	renderIndexType() {
		const { currentTabRecipient } = this.state;
		const rec = currentTabRecipient.value || '';
		let routeOfType = ['value', 'content', rec, INDEPENDENTS, TARGET_INDEXTYPE, 'type'].join('.');
		let routeOfLowValue = ['value', 'content', rec, INDEPENDENTS, TARGET_INDEXTYPE, 'lowValue'].join('.');

		return (
			<div>
				<Flex column alignItems="start">
					<Flex row>
						<span className={styles.fieldTitle}>{"Indextype"}</span>
					</Flex>
					<Flex row>
						<span className={styles.fieldLabel}>{"Please insert the indextype values for this template."}</span>
					</Flex>
				</Flex>

				<Flex column alignItems="start">
					<Flex row style={{width:"100%"}}>
						<Flex column flex={1} alignItems="start">
							<span className={styles.fieldLabel}>{"Type"}</span>
						</Flex>
						<Flex column flex={3} alignItems="start">
							<FormInput
								value={nesProp.get(this.state, routeOfType) || ''}
								onChange={(e) => {this.changeIndexType(e.target.value, null)}}
							/>
						</Flex>
					</Flex>
					<Flex row style={{width:"100%"}}>
						<Flex column flex={1} alignItems="start">
							<span className={styles.fieldLabel}>{"Low value"}</span>
						</Flex>

						<Flex column flex={3} alignItems="start">
							<FormInput
								value={nesProp.get(this.state, routeOfLowValue) || ''}
								onChange={(e) => {this.changeIndexType(null, e.target.value)}}
							/>
						</Flex>

					</Flex>
				</Flex>
			</div>
		);
	},

	/**
	 * Master renderer of the field.
	 */
	renderField() {
		const { currentTabRecipient, currentTabLang } = this.state;
		const { editorLoaded } = this.state;
		const { recipients } = this.state.value || {recipients: []};
		let areEditorsVisible = !_.isEmpty(recipients) && _.isArray(recipients) && recipients.length > 0;
		areEditorsVisible = areEditorsVisible && !!nesProp.get(this.state, ['value','module'].join('.'));

		return (
			<div>
			<Flex column alignItems="start">
				<Flex row>
					<span className={styles.fieldTitle}>{"Module"}</span>
				</Flex>
				<Flex row>
					<span className={styles.fieldLabel}>{"Please select a module for this template."}</span>
				</Flex>
			</Flex>
				<Flex column flex={1} alignItems="stretch" key={"moduleSelectorKey"}>
					{this.renderModuleSelector()}
				</Flex>
				<Flex column alignItems="start">
					<Flex row>
						<span className={styles.fieldTitle}>{"Recipients"}</span>
					</Flex>
					<Flex row>
						<span className={styles.fieldLabel}>{"Please select recipients for this template."}</span>
					</Flex>
				</Flex>
				<Flex column flex={1} alignItems="stretch" key={"recipientSelectorKey"}>
					<ListComposer
						allValues={this.state.allRecipients}
						allSelected={this.state.value.recipients}
						onChange={this.onChangeRecipients}
						options={{
							handleDefault: true
						}}
					/>
				</Flex>

				<FormInput
					name={this.getInputName(this.props.path)}
					ref="focusTarget"
					value={JSON.stringify(this.state.value)}
					onChange={()=>{}}
					type="hidden"
				/>

				<Flex column alignItems="start" className={cs(styles.holderForBlocks, (!areEditorsVisible ? styles.visibleNone : null))}>
					<Flex row>
						<span className={styles.fieldTitle}>{"Recipient specific content"}</span>
					</Flex>
					<Flex row>
						<span className={styles.fieldLabel}>{"You can navigate between recipients by using tabs below."}</span>
					</Flex>
				</Flex>
				<TabRow
					key={"keyOneTabRow"}
					onChange={this.onTabRecipeintSet}
					tabs={this.state.value && this.state.value.recipients || []}
					selected={this.state.currentTabRecipient}
					className={cs(styles.holderForBlocks, (!areEditorsVisible ? styles.visibleNone : null))}
				/>
				<Flex column flex={1} alignItems="stretch"
					className={cs(styles.tabContent, (!areEditorsVisible ? styles.visibleNone : null))}>

					{this.renderVariableSelector()}

					<Flex column alignItems="start">
						<Flex row>
							<span className={styles.fieldTitle}>{"Languages"}</span>
						</Flex>
						<Flex row>
							<span className={styles.fieldLabel}>{"You can navigate between languages by using tabs below."}</span>
						</Flex>
					</Flex>
					<TabRow
						key={"keyTwoTabRow"}
						onChange={this.onTabLangSet}
						tabs={this.state.allLanguages && this.state.allLanguages.values || []}
						selected={this.state.currentTabLang}
					/>

					<Flex column flex={1} alignItems="stretch" className={cs(styles.tabContent,styles.languageTabContent)}>
						{editorLoaded && this.renderSubjectEditor()}
						{editorLoaded && this.renderBodyEditor()}
					</Flex>
					{this.renderIndexType()}
				</Flex>
				{this.state.confirmationDialog}
			</div>
		);
	},

	/**
	 * This is the render value methode used somwhere, this is not ready. I have no idea wheere to use and how.
	 * TODO implement it, find functionality!
	 */
	renderValue () {
		return this.props.value ? (
			<FormInput noedit href={'mailto:' + this.props.value}>{this.props.value}</FormInput>
		) : (
			<FormInput noedit>(not set)</FormInput>
		);
	},
});