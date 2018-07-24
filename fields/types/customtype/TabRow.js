var React = require('react');
import _ from 'lodash';
import { Flex } from 'react-flex';
import 'react-flex/index.css';
import cs from 'classnames';
import styles from './CTstyle.css';

export default class TabRow extends React.Component {
	/* constructor(props) {
		super(props);

		let tabs = this.props && this.props.tabs || [];
		this.state = {
			tabs: tabs,
			selected: this.props.selected
		};
	} */
	componentWillMount() {
		let tabs = this.props && this.props.tabs || [];
		this.state = {
			tabs: tabs,
			selected: this.props.selected
		};
	}

	onTabSet(tabValue) {
		this.setState({
			selected: {value: tabValue}
		});

		// trigger the callback when change tab
		this.props.onChange(tabValue);
	}

	// dispatching an action based on state change
	componentWillUpdate(nextProps, nextState) {
		if (nextProps.selected && nextProps.selected.value !== this.state.selected) {
			nextState.selected = {value: nextProps.selected.value};
		}
		if (nextProps.tabs && nextProps.tabs.length !== this.state.tabs.length) {
			nextState.tabs = nextProps.tabs;
		}
	}

	render() {
		const {tabs, selected} = this.state;
		return (
			<Flex column flex={1} alignItems="stretch" className={this.props.className}>
				<Flex row alignItems="stretch" flex={1} key={"primaryTabs"}>
					{tabs && tabs.map((tab, index) => {
						return (
							<Flex column alignItems="start" key={"primaryTabNumber"+index}
								className={cs(styles.tab, styles.noselect, (tab.value === selected.value) ? styles.active : null)}
								onClick={(ev)=>{this.onTabSet(tab.value);}}
							>
								{tab.label}
							</Flex>
						);
					})}
				</Flex>
			</Flex>
		);
	}

};

TabRow.propTypes = {
	className: React.PropTypes.string,
	tabs: React.PropTypes.array.isRequired,
	onChange: React.PropTypes.func.isRequired,
	selected: React.PropTypes.object,
};