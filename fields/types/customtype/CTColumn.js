import React from 'react';
import ItemsTableCell from '../../components/ItemsTableCell';
import ItemsTableValue from '../../components/ItemsTableValue';
import nesProp from 'nested-property';

var CTColumn = React.createClass({
	displayName: 'Custom Type',
	propTypes: {
		col: React.PropTypes.object,
		data: React.PropTypes.object,
		linkTo: React.PropTypes.string,
	},
	renderVirtualVal(val) {
		if ( !val ) {
			return '';
		}

		if ( Array.isArray(val) ) {
			return val.reduce((sum, current)=>{
				return sum + ', '+JSON.stringify(current)
			}, '')
		}

		if ( typeof val == 'object') {
			return JSON.stringify(val);
		}

		return  val;
	},
	getValue () {
		// cropping text is important for textarea, which uses this column
		//console.log(this.props.col)
		//console.log(this.props.list.defaultColumnPaths)
		//console.log(this.props.list.expandedDefaultColumns)

		if ( this.props.col.path === 'templateContent' && !this.props.col.virtualPath ) {
			let i = nesProp.get( this.props, 'col.currentColumnNumber');
			this.props.col.label = nesProp.get( this.props, 'list.expandedDefaultColumns.'+i+'.label' );
			this.props.col.path = nesProp.get( this.props, 'list.expandedDefaultColumns.'+i+'.path' );
			this.props.col.type = nesProp.get( this.props, 'list.expandedDefaultColumns.'+i+'.type' );
			this.props.col.virtualPath = nesProp.get( this.props, 'list.expandedDefaultColumns.'+i+'.virtualPath' );
			this.props.col.virtualLabel = nesProp.get( this.props, 'list.expandedDefaultColumns.'+i+'.virtualLabel' );
			this.props.col.width = nesProp.get( this.props, 'list.expandedDefaultColumns.'+i+'.width' );
		}

		const value = this.props.data.fields[this.props.col.path];
		const objValue = value ? JSON.parse(value) : {};

		let virtualVal = null
		if ( this.props.col.virtualPath ) {
			virtualVal = objValue[this.props.col.virtualPath]

			// Humanify
			let modulesDetailsList = nesProp.get(this.props, 'col.field.options.modules.values');
			let modulesDetails = {};
			if ( modulesDetailsList && Array.isArray(modulesDetailsList) && modulesDetailsList.length > 0 ) {
				modulesDetailsList.forEach((oneModule) => {
					modulesDetails[oneModule.value] = oneModule.label
				});
			}

			if ( this.props.col.virtualPath == 'module' ) {
				virtualVal = nesProp.get(modulesDetails, virtualVal) || virtualVal;
			}

			if ( this.props.col.virtualPath == 'recipients' ) {
				virtualVal = virtualVal.reduce((sum, current) => {
					return sum + (sum ? (', ') : '') +current.label
				}, '');
			}

			if ( this.props.col.virtualPath == 'content.*.independents.indextype' ) {
				virtualVal = [];
				let wProdIT = nesProp.get(objValue, 'content.willemotProduction.independents.indextype.type');
				let wClaimIT = nesProp.get(objValue, 'content.willemotClaims.independents.indextype.type');
				let wThirdPartIT = nesProp.get(objValue, 'content.thirdParties.independents.indextype.type');

				//console.log( "objValue objValue objValue", objValue);
				//console.log( "virtualVal virtualVal virtualVal", virtualVal, wProdIT, wClaimIT, wThirdPartIT);

				if( wProdIT ) { virtualVal.push(wProdIT); }
				if( wClaimIT ) { virtualVal.push(wClaimIT); }
				if( wThirdPartIT ) { virtualVal.push(wThirdPartIT); }

				virtualVal = virtualVal.join(', ')
			}
		}
		return value ? (this.props.col.virtualPath ? this.renderVirtualVal(virtualVal) : value) : null;
		//return value ? value.substr(0, 100) : null;
	},
	render () {
		const value = this.getValue();
		const empty = !value && this.props.linkTo ? true : false;
		return (
			<ItemsTableCell>
				<ItemsTableValue to={this.props.linkTo} empty={empty} padded interior field={this.props.col.type}>
					{value}
				</ItemsTableValue>
			</ItemsTableCell>
		);
	},
});

module.exports = CTColumn;