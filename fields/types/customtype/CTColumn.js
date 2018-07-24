import React from 'react';
import ItemsTableCell from '../../components/ItemsTableCell';
import ItemsTableValue from '../../components/ItemsTableValue';

var CTColumn = React.createClass({
	displayName: 'Custom Type',
	propTypes: {
		col: React.PropTypes.object,
		data: React.PropTypes.object,
		linkTo: React.PropTypes.string,
	},
	getValue () {
		// cropping text is important for textarea, which uses this column
		const value = this.props.data.fields[this.props.col.path];
		return value ? value.substr(0, 100) : null;
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