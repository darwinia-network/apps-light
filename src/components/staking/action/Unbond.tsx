import { Button } from 'antd';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccount, useApi, useStaking } from '../../../hooks';
import { Fund } from '../../../model';
import { fundParam, getLedger, fromWei, prettyNumber } from '../../../utils';
import { FormModal } from '../../widget/FormModal';
import { AddressItem } from '../../widget/form-control/AddressItem';
import { FundItem } from '../../widget/form-control/FundItem';
import { Label } from '../../widget/form-control/Label';

interface UnbondFormValues {
  controller: string;
  fund: Fund;
  [key: string]: unknown;
}

export function Unbond() {
  const { t } = useTranslation();
  const { api } = useApi();
  const [isVisible, setIsVisible] = useState(false);
  const { isControllerAccountOwner, controllerAccount, isStakingLedgerEmpty, stakingDerive } = useStaking();
  const { assets } = useAccount();

  const ledgers = useMemo(
    () =>
      assets.map((item) => ({
        asset: item.asset,
        symbol: item.token.symbol,
        ...getLedger(item.token.symbol, isStakingLedgerEmpty, stakingDerive),
      })),
    [assets, isStakingLedgerEmpty, stakingDerive]
  );

  return (
    <>
      <Button disabled={!isControllerAccountOwner} onClick={() => setIsVisible(true)} type="text">
        {t('Unbond funds')}
      </Button>

      <FormModal<UnbondFormValues>
        modalProps={{
          visible: isVisible,
          title: (
            <Label
              text={t('Unbond')}
              info={t('unbond tokens for staking, unbonded tokens become available after 14 days')}
            />
          ),
        }}
        onCancel={() => setIsVisible(false)}
        extrinsic={(values) => {
          const { fund } = values;
          const param = fundParam(fund);

          return api.tx.staking.unbond(param);
        }}
        onSuccess={() => {
          setIsVisible(false);
        }}
        initialValues={{ controller: controllerAccount }}
      >
        <AddressItem
          label="Controller account"
          name="controller"
          disabled
          extra={
            <span className="inline-flex items-center gap-2 text-xs">
              <span>{t('available')}: </span>
              {ledgers.map((item) => (
                <span key={item.asset}>
                  <span>{fromWei({ value: item.bonded }, prettyNumber)}</span>
                  <span className="uppercase">{item.symbol}</span>
                </span>
              ))}
            </span>
          }
        />

        <FundItem
          label={
            <Label
              text={t('Unbond amount')}
              info={t('The amount of funds to unbond, this is adjusted using the bonded funds on the stash account.')}
            />
          }
          name="fund"
          extra={null}
          max={ledgers.reduce((acc, cur) => ({ ...acc, [cur.asset]: cur.bonded }), {})}
        />
      </FormModal>
    </>
  );
}
