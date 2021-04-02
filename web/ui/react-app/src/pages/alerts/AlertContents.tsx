import React, { FC, Fragment } from 'react';
import { Badge, Input } from 'reactstrap';
import CollapsibleAlertPanel from './CollapsibleAlertPanel';
import Checkbox from '../../components/Checkbox';
import { isPresent } from '../../utils';
import { Rule } from '../../types/types';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import fuzzy from 'fuzzy';

export type RuleState = keyof RuleStatus<any>;

export interface RuleStatus<T> {
  firing: T;
  pending: T;
  inactive: T;
}

export interface AlertsProps {
  groups?: RuleGroup[];
  statsCount: RuleStatus<number>;
}

export interface Alert {
  labels: Record<string, string>;
  state: RuleState;
  value: string;
  annotations: Record<string, string>;
  activeAt: string;
}

interface RuleGroup {
  name: string;
  file: string;
  rules: Rule[];
  interval: number;
}

const stateColorTuples: Array<[RuleState, 'success' | 'warning' | 'danger']> = [
  ['inactive', 'success'],
  ['pending', 'warning'],
  ['firing', 'danger'],
];

const AlertsContent: FC<AlertsProps> = ({ groups = [], statsCount }) => {
  const [filter, setFilter] = useLocalStorage('alerts-status-filter', {
    firing: true,
    pending: true,
    inactive: true,
  });
  const [showAnnotations, setShowAnnotations] = useLocalStorage('alerts-annotations-status', { checked: false });

  const toggleFilter = (ruleState: RuleState) => () => {
    setFilter({
      ...filter,
      [ruleState]: !filter[ruleState],
    });
  };

  const [searchText, setSearchText] = useLocalStorage('alerts-search-text', '');

  const filterRules = (rules: Rule[]) => {
    return fuzzy
      .filter(searchText, rules, {
        extract: function(el) {
          return el.name;
        },
      })
      .map(el => el.original);
  };

  const filterBySearch = (groups: RuleGroup[]) => {
    const filteredGroups: RuleGroup[] = [];
    groups.forEach(group => {
      const filteredRules = filterRules(group.rules);
      if (filterRules && filterRules.length > 0) {
        filteredGroups.push({
          ...group,
          rules: filteredRules,
        });
      }
    });
    return filteredGroups;
  };

  return (
    <>
      <div className="d-flex mb-4">
        <Input
          id="alert-search-input"
          aria-label="Search Text Input"
          type="search"
          placeholder="Search"
          value={searchText}
          onChange={event => setSearchText(event.target.value)}
        />
      </div>

      <div className="d-flex togglers-wrapper">
        {stateColorTuples.map(([state, color]) => {
          return (
            <Checkbox
              key={state}
              wrapperStyles={{ marginRight: 10 }}
              checked={filter[state]}
              id={`${state}-toggler`}
              onChange={toggleFilter(state)}
            >
              <Badge color={color} className="text-capitalize">
                {state} ({statsCount[state]})
              </Badge>
            </Checkbox>
          );
        })}
        <Checkbox
          wrapperStyles={{ marginLeft: 'auto' }}
          checked={showAnnotations.checked}
          id="show-annotations-toggler"
          onChange={({ target }) => setShowAnnotations({ checked: target.checked })}
        >
          <span style={{ fontSize: '0.9rem', lineHeight: 1.9 }}>Show annotations</span>
        </Checkbox>
      </div>

      {filterBySearch(groups).map((group, i) => {
        const hasFilterOn = group.rules.some(rule => filter[rule.state]);
        return hasFilterOn ? (
          <Fragment key={i}>
            <GroupInfo rules={group.rules}>
              {group.file} &gt; {group.name}
            </GroupInfo>
            {group.rules.map((rule, j) => {
              return (
                filter[rule.state] && (
                  <CollapsibleAlertPanel key={rule.name + j} showAnnotations={showAnnotations.checked} rule={rule} />
                )
              );
            })}
          </Fragment>
        ) : null;
      })}
    </>
  );
};

interface GroupInfoProps {
  rules: Rule[];
}

export const GroupInfo: FC<GroupInfoProps> = ({ rules, children }) => {
  const statesCounter = rules.reduce<any>(
    (acc, r) => {
      return {
        ...acc,
        [r.state]: acc[r.state] + r.alerts.length,
      };
    },
    {
      firing: 0,
      pending: 0,
    }
  );

  return (
    <div className="group-info border rounded-sm" style={{ lineHeight: 1.1 }}>
      {children}
      <div className="badges-wrapper">
        {isPresent(statesCounter.inactive) && <Badge color="success">inactive</Badge>}
        {statesCounter.pending > 0 && <Badge color="warning">pending ({statesCounter.pending})</Badge>}
        {statesCounter.firing > 0 && <Badge color="danger">firing ({statesCounter.firing})</Badge>}
      </div>
    </div>
  );
};

AlertsContent.displayName = 'Alerts';

export default AlertsContent;
