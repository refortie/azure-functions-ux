import React, { useState, useContext, useEffect } from 'react';
import ConfigurationCommandBar from './ConfigurationCommandBar';
import DisplayTableWithCommandBar from '../../../components/DisplayTableWithCommandBar/DisplayTableWithCommandBar';
import {
  ICommandBarItemProps,
  IColumn,
  SelectionMode,
  DetailsListLayoutMode,
  Link,
  TooltipHost,
  ActionButton,
  SearchBox,
  MessageBarType,
} from 'office-ui-fabric-react';
import { useTranslation } from 'react-i18next';
import { EnvironmentVariable, PanelType } from './Configuration.types';
import { defaultCellStyle } from '../../../components/DisplayTableWithEmptyMessage/DisplayTableWithEmptyMessage';
import { formStyle, commandBarSticky } from './Configuration.styles';
import { learnMoreLinkStyle } from '../../../components/form-controls/formControl.override.styles';
import ConfigurationEnvironmentSelector from './ConfigurationEnvironmentSelector';
import { ArmObj } from '../../../models/arm-obj';
import { Environment } from '../../../models/static-site/environment';
import IconButton from '../../../components/IconButton/IconButton';
import { dirtyElementStyle } from '../../app/app-settings/AppSettings.styles';
import { ThemeContext } from '../../../ThemeContext';
import { filterBoxStyle } from '../../app/functions/app-keys/AppKeys.styles';
import Panel from '../../../components/Panel/Panel';
import ConfigurationAddEdit from './ConfigurationAddEdit';
import { sortBy } from 'lodash-es';
import { KeyValue } from '../../../models/portal-models';
import ConfigurationData from './Configuration.data';
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog';
import ConfigurationAdvancedAddEdit from './ConfigurationAdvancedAddEdit';
import CustomBanner from '../../../components/CustomBanner/CustomBanner';
import { Links } from '../../../utils/FwLinks';

interface ConfigurationProps {
  environments: ArmObj<Environment>[];
  isLoading: boolean;
  hasWritePermissions: boolean;
  apiFailure: boolean;
  environmentHasFunctions: boolean;
  fetchDataOnEnvironmentChange: (resourceId: string) => {};
  saveEnvironmentVariables: (resourceId: string, environmentVariables: EnvironmentVariable[]) => void;
  refresh: () => void;
  selectedEnvironmentVariableResponse?: ArmObj<KeyValue<string>>;
}

const Configuration: React.FC<ConfigurationProps> = props => {
  const {
    environments,
    selectedEnvironmentVariableResponse,
    saveEnvironmentVariables,
    isLoading,
    hasWritePermissions,
    apiFailure,
    fetchDataOnEnvironmentChange,
    environmentHasFunctions,
  } = props;

  const [shownValues, setShownValues] = useState<string[]>([]);
  const [showAllValues, setShowAllValues] = useState(false);
  const [environmentVariables, setEnvironmentVariables] = useState<EnvironmentVariable[]>([]);
  const [showFilter, setShowFilter] = useState(false);
  const [filter, setFilter] = useState('');
  const [showPanel, setShowPanel] = useState(false);
  const [panelType, setPanelType] = useState<PanelType | undefined>(undefined);
  const [currentEnvironmentVariableIndex, setCurrentEnvironmentVariableIndex] = useState<number | undefined>(undefined);
  const [selectedEnvironment, setSelectedEnvironment] = useState<ArmObj<Environment> | undefined>(undefined);
  const [isDirty, setIsDirty] = useState(false);
  const [isDiscardConfirmDialogVisible, setIsDiscardConfirmDialogVisible] = useState(false);
  const [isOnChangeConfirmDialogVisible, setIsOnChangeConfirmDialogVisible] = useState(false);
  const [onChangeEnvironment, setOnChangeEnvironment] = useState<ArmObj<Environment> | undefined>(undefined);
  const [isRefreshConfirmDialogVisible, setIsRefreshConfirmDialogVisible] = useState(false);

  const { t } = useTranslation();

  const theme = useContext(ThemeContext);

  const openAddNewEnvironmentVariablePanel = () => {
    setShowPanel(true);
    setPanelType(PanelType.edit);
  };

  const openEditEnvironmentVariablePanel = (index: number) => {
    setCurrentEnvironmentVariableIndex(index);
    setShowPanel(true);
    setPanelType(PanelType.edit);
  };

  const toggleHideButton = () => {
    let newShownValues: string[] = [];
    if (!showAllValues) {
      newShownValues = environmentVariables.map(x => x.name);
    }
    setShownValues(newShownValues);
    setShowAllValues(!showAllValues);
  };

  const openBulkEdit = () => {
    setShowPanel(true);
    setPanelType(PanelType.bulk);
  };

  const toggleFilter = () => {
    setShowFilter(!showFilter);
    setFilter('');
  };

  const isTableCommandBarDisabled = () => {
    return isLoading || !hasWritePermissions || apiFailure;
  };

  const getCommandBarItems = (): ICommandBarItemProps[] => {
    const allShown = showAllValues || (environmentVariables.length > 0 && shownValues.length === environmentVariables.length);

    return [
      {
        key: 'add-new-environment-variable',
        onClick: openAddNewEnvironmentVariablePanel,
        disabled: isTableCommandBarDisabled(),
        iconProps: { iconName: 'Add' },
        name: t('staticSite_addNewEnvironmentVariable'),
        ariaLabel: t('staticSite_ariaLabel_addNewEnvironmentVariable'),
      },
      {
        key: 'environment-variable-show-hide',
        onClick: toggleHideButton,
        disabled: isTableCommandBarDisabled(),
        iconProps: { iconName: !allShown ? 'RedEye' : 'Hide' },
        name: !allShown ? t('showValues') : t('hideValues'),
      },
      {
        key: 'environment-variable-bulk-edit',
        onClick: openBulkEdit,
        disabled: isTableCommandBarDisabled(),
        iconProps: { iconName: 'Edit' },
        name: t('advancedEdit'),
      },
      {
        key: 'environment-variable-show-filter',
        onClick: toggleFilter,
        disabled: isTableCommandBarDisabled(),
        iconProps: { iconName: 'Filter' },
        name: t('filter'),
      },
    ];
  };

  const onRenderColumnItem = (item: EnvironmentVariable, index: number, column: IColumn) => {
    const itemKey = item.name;
    const hidden = !shownValues.includes(itemKey) && !showAllValues;
    if (!column || !item) {
      return null;
    }
    if (column.key === 'delete') {
      return (
        <TooltipHost
          content={t('delete')}
          id={`environment-variable-delete-tooltip-${index}`}
          calloutProps={{ gapSpace: 0 }}
          closeDelay={500}>
          <IconButton
            className={defaultCellStyle}
            disabled={false}
            id={`environment-variable-delete-${index}`}
            iconProps={{ iconName: 'Delete' }}
            ariaLabel={t('delete')}
            onClick={() => {
              deleteEnvironmentVariable(index);
            }}
          />
        </TooltipHost>
      );
    }
    if (column.key === 'edit') {
      return (
        <TooltipHost content={t('edit')} id={`environment-variable-edit-tooltip-${index}`} calloutProps={{ gapSpace: 0 }} closeDelay={500}>
          <IconButton
            className={defaultCellStyle}
            disabled={false}
            id={`environment-variable-edit-${index}`}
            iconProps={{ iconName: 'Edit' }}
            ariaLabel={t('edit')}
            onClick={() => {
              openEditEnvironmentVariablePanel(index);
            }}
          />
        </TooltipHost>
      );
    }
    if (column.key === 'value') {
      return (
        <>
          <ActionButton
            id={`environment-variable-show-hide-${index}`}
            className={defaultCellStyle}
            onClick={() => onShowHideButtonClick(itemKey)}
            iconProps={{ iconName: hidden ? 'RedEye' : 'Hide' }}>
            {hidden ? (
              <div className={defaultCellStyle}>{t('hiddenValueClickAboveToShow')}</div>
            ) : (
              <div className={defaultCellStyle} id={`app-settings-application-settings-value-${index}`}>
                {item[column.fieldName!]}
              </div>
            )}
          </ActionButton>
        </>
      );
    }
    if (column.key === 'name') {
      column.className = '';
      if (isEnvironmentVariableDirty(index)) {
        column.className = dirtyElementStyle(theme);
      }
      return (
        <ActionButton
          className={defaultCellStyle}
          disabled={false}
          id={`environment-variable-name-${index}`}
          onClick={() => {
            openEditEnvironmentVariablePanel(index);
          }}>
          <span aria-live="assertive" role="region">
            {item[column.fieldName!]}
          </span>
        </ActionButton>
      );
    }
    return <div className={defaultCellStyle}>{item[column.fieldName!]}</div>;
  };

  const getColumns = (): IColumn[] => {
    return [
      {
        key: 'name',
        name: t('nameRes'),
        fieldName: 'name',
        minWidth: 210,
        maxWidth: 350,
        isRowHeader: true,
        data: 'string',
        isPadded: true,
        isResizable: true,
        onRender: onRenderColumnItem,
      },
      {
        key: 'value',
        name: t('value'),
        fieldName: 'value',
        minWidth: 260,
        isRowHeader: false,
        data: 'string',
        isPadded: true,
        isResizable: true,
        onRender: onRenderColumnItem,
      },
      {
        key: 'delete',
        name: t('delete'),
        fieldName: 'delete',
        minWidth: 50,
        isRowHeader: false,
        data: 'string',
        isPadded: true,
        isResizable: true,
        onRender: onRenderColumnItem,
      },
      {
        key: 'edit',
        name: t('edit'),
        fieldName: 'edit',
        minWidth: 50,
        maxWidth: 50,
        isRowHeader: false,
        isResizable: false,
        isCollapsable: false,
        onRender: onRenderColumnItem,
      },
    ];
  };

  const onDropdownChange = (environment: ArmObj<Environment>) => {
    if (isDirty) {
      setOnChangeEnvironment(environment);
      setIsOnChangeConfirmDialogVisible(true);
    } else {
      onEnvironmentChange(environment);
    }
  };

  const isEnvironmentVariableDirty = (index: number): boolean => {
    const initialEnvironmentVariables = getInitialEnvironmentVariables();
    const currentRow = environmentVariables[index];
    const currentEnvironmentVariableIndex = initialEnvironmentVariables.findIndex(x => {
      return x.name.toLowerCase() === currentRow.name.toLowerCase() && x.value.toLowerCase() === currentRow.value.toLowerCase();
    });
    return currentEnvironmentVariableIndex < 0;
  };

  const onShowHideButtonClick = (itemKey: string) => {
    const hidden = !shownValues.includes(itemKey) && !showAllValues;
    const newShownValues = new Set(shownValues);
    if (hidden) {
      newShownValues.add(itemKey);
    } else {
      newShownValues.delete(itemKey);
    }
    setShowAllValues(newShownValues.size === environmentVariables.length);
    setShownValues([...newShownValues]);
  };

  const onCancel = () => {
    setShowPanel(false);
    setPanelType(undefined);
    setCurrentEnvironmentVariableIndex(undefined);
  };

  const updateEnvironmentVariable = (updatedEnvironmentVariables: EnvironmentVariable[]) => {
    const sortedUpdatedEnvironmentVariables = sort(updatedEnvironmentVariables);
    setEnvironmentVariables([...sortedUpdatedEnvironmentVariables]);
  };

  const sort = (environmentVariables: EnvironmentVariable[]) => {
    return sortBy(environmentVariables, e => e.name.toLocaleLowerCase());
  };

  const save = () => {
    if (!!selectedEnvironment) {
      saveEnvironmentVariables(selectedEnvironment.id, environmentVariables);
    }
  };

  const getInitialEnvironmentVariables = () => {
    if (!!selectedEnvironmentVariableResponse) {
      return sort(ConfigurationData.convertEnvironmentVariablesObjectToArray(selectedEnvironmentVariableResponse.properties));
    } else {
      return [];
    }
  };

  const getDirtyState = (newEnvironmentVariables: EnvironmentVariable[]) => {
    const initialEnvironmentVariables = getInitialEnvironmentVariables();
    return (
      newEnvironmentVariables.length !== initialEnvironmentVariables.length ||
      newEnvironmentVariables.filter((environmentVariable, index) => {
        return (
          environmentVariable.name.toLocaleLowerCase() !== initialEnvironmentVariables[index].name.toLocaleLowerCase() ||
          environmentVariable.value.toLocaleLowerCase() !== initialEnvironmentVariables[index].value.toLocaleLowerCase()
        );
      }).length > 0
    );
  };

  const initEnvironmentVariables = () => {
    setEnvironmentVariables(getInitialEnvironmentVariables());
  };

  const discard = () => {
    initEnvironmentVariables();
    hideDiscardConfirmDialog();
  };

  const hideDiscardConfirmDialog = () => {
    setIsDiscardConfirmDialogVisible(false);
  };

  const hideOnChangeConfirmDialog = () => {
    setIsOnChangeConfirmDialogVisible(false);
    setOnChangeEnvironment(undefined);
  };

  const onEnvironmentChange = (environment?: ArmObj<Environment>) => {
    const env: ArmObj<Environment> | undefined = onChangeEnvironment || environment;
    if (!!env) {
      fetchDataOnEnvironmentChange(env.id);
      setSelectedEnvironment(env);
    }
    hideOnChangeConfirmDialog();
  };

  const deleteEnvironmentVariable = (index: number) => {
    if (index < environmentVariables.length) {
      const deleteItem = environmentVariables[index];
      setEnvironmentVariables([...environmentVariables.filter(environmentVariable => environmentVariable !== deleteItem)]);
    }
  };

  const setDefaultSelectedEnvironment = () => {
    if (environments.length > 0 && !selectedEnvironment) {
      onEnvironmentChange(environments[0]);
    }
  };

  const refresh = () => {
    setIsRefreshConfirmDialogVisible(false);
    setSelectedEnvironment(undefined);
    props.refresh();
  };

  const hideRefreshConfirmDialog = () => {
    setIsRefreshConfirmDialogVisible(false);
  };

  const getBanner = () => {
    const bannerInfo = { message: '', type: MessageBarType.info };
    if (!hasWritePermissions) {
      bannerInfo.message = t('staticSite_readOnlyRbac');
    } else if (!environmentHasFunctions) {
      bannerInfo.message = t('staticSite_noFunctionMessage');
    }
    return !!bannerInfo.message ? <CustomBanner message={bannerInfo.message} type={bannerInfo.type} /> : <></>;
  };

  useEffect(() => {
    setDefaultSelectedEnvironment();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [environments]);
  useEffect(() => {
    const dirtyState = getDirtyState(environmentVariables);
    setIsDirty(dirtyState);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [environmentVariables]);
  useEffect(() => {
    initEnvironmentVariables();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEnvironmentVariableResponse]);
  return (
    <>
      <div className={commandBarSticky}>
        <ConfigurationCommandBar
          save={save}
          dirty={isDirty}
          isLoading={isLoading}
          showDiscardConfirmDialog={() => setIsDiscardConfirmDialogVisible(true)}
          refresh={() => {
            if (isDirty) {
              setIsRefreshConfirmDialogVisible(true);
            } else {
              refresh();
            }
          }}
        />
      </div>
      {getBanner()}
      <>
        <ConfirmDialog
          primaryActionButton={{
            title: t('ok'),
            onClick: discard,
          }}
          defaultActionButton={{
            title: t('cancel'),
            onClick: hideDiscardConfirmDialog,
          }}
          title={t('discardChangesTitle')}
          content={t('staticSite_discardChangesMesssage').format(
            !!selectedEnvironment ? ConfigurationData.getEnvironmentName(selectedEnvironment) : ''
          )}
          hidden={!isDiscardConfirmDialogVisible}
          onDismiss={hideDiscardConfirmDialog}
        />
        <ConfirmDialog
          primaryActionButton={{
            title: t('ok'),
            onClick: onEnvironmentChange,
          }}
          defaultActionButton={{
            title: t('cancel'),
            onClick: hideOnChangeConfirmDialog,
          }}
          title={t('staticSite_changeEnvironmentTitle')}
          content={t('staticSite_changeEnvironmentMessage')}
          hidden={!isOnChangeConfirmDialogVisible}
          onDismiss={hideOnChangeConfirmDialog}
        />
        <ConfirmDialog
          primaryActionButton={{
            title: t('ok'),
            onClick: refresh,
          }}
          defaultActionButton={{
            title: t('cancel'),
            onClick: hideRefreshConfirmDialog,
          }}
          title={t('staticSite_refreshConfirmTitle')}
          content={t('staticSite_refreshConfirmMessage')}
          hidden={!isRefreshConfirmDialogVisible}
          onDismiss={hideRefreshConfirmDialog}
        />
      </>
      <div className={formStyle}>
        <h3>{t('staticSite_environmentVariables')}</h3>
        <p>
          <span id="environment-variable-info-message">{t('staticSite_environmentVariablesInfoMessage')}</span>
          <Link
            id="environment-variable-info-learnMore"
            href={Links.staticSiteEnvironmentVariablesLearnMore}
            target="_blank"
            className={learnMoreLinkStyle}
            aria-labelledby="environment-variable-info-message">
            {` ${t('learnMore')}`}
          </Link>
        </p>
        <ConfigurationEnvironmentSelector
          environments={environments}
          onDropdownChange={onDropdownChange}
          disabled={isLoading || !hasWritePermissions}
          selectedEnvironment={selectedEnvironment}
        />
        <DisplayTableWithCommandBar
          commandBarItems={getCommandBarItems()}
          columns={getColumns()}
          items={environmentVariables.filter(environmentVariable => {
            if (!filter) {
              return true;
            }
            return environmentVariable.name.toLowerCase().includes(filter.toLowerCase());
          })}
          isHeaderVisible={true}
          layoutMode={DetailsListLayoutMode.justified}
          selectionMode={SelectionMode.none}
          selectionPreservedOnEmptyClick={true}
          emptyMessage={t('staticSite_emptyEnvironmentVariableList')}
          shimmer={{ lines: 2, show: isLoading }}>
          {showFilter && (
            <SearchBox
              id="environment-variable-search"
              className="ms-slideDownIn20"
              autoFocus
              iconProps={{ iconName: 'Filter' }}
              styles={filterBoxStyle}
              placeholder={t('staticSite_filterEnvironmentVariable')}
              onChange={newValue => setFilter(newValue)}
            />
          )}
        </DisplayTableWithCommandBar>
        <Panel
          isOpen={showPanel && panelType === PanelType.edit}
          onDismiss={onCancel}
          headerText={
            currentEnvironmentVariableIndex === undefined
              ? t('staticSite_addEnvironmentVariableHeader')
              : t('staticSite_editEnvironmentVariableHeader')
          }>
          <ConfigurationAddEdit
            currentEnvironmentVariableIndex={currentEnvironmentVariableIndex!}
            environmentVariables={environmentVariables}
            cancel={onCancel}
            updateEnvironmentVariable={updateEnvironmentVariable}
          />
        </Panel>
        <Panel isOpen={showPanel && panelType === PanelType.bulk} onDismiss={onCancel}>
          <ConfigurationAdvancedAddEdit
            environmentVariables={environmentVariables}
            cancel={onCancel}
            updateEnvironmentVariable={updateEnvironmentVariable}
          />
        </Panel>
      </div>
    </>
  );
};

export default Configuration;
