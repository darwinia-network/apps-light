import { Card, Descriptions, Badge, Breadcrumb, Spin } from 'antd';
import { NavLink } from 'react-router-dom';
import { formatDistance, format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { capitalize } from 'lodash';

import { Path } from '../../config/routes';
import { ORDER_DETAIL, DATE_TIME_FORMATE } from '../../config';
import { DarwiniaChain, SlotState, RelayerRole, TOrderDetail } from '../../model';
import { useApi, useMyQuery } from '../../hooks';
import { SubscanLink } from '../widget/SubscanLink';
import { fromWei, prettyNumber } from '../../utils';
import { AccountName } from '../widget/account/AccountName';

const getPrioritySlot = (confirmedSlotIndex?: number | null): string => {
  switch (confirmedSlotIndex) {
    case -1:
      return SlotState.OUT_OF_SLOT;
    case 0:
      return SlotState.SLOT_1;
    case 1:
      return SlotState.SLOT_2;
    case 2: // eslint-disable-line no-magic-numbers
      return SlotState.SLOT_3;
    default:
      return '-';
  }
};

// eslint-disable-next-line complexity
export const OrderDetail = ({
  orderid,
  destination,
  setRefresh,
}: {
  orderid: string;
  destination: DarwiniaChain;
  setRefresh: (fn: () => void) => void;
}) => {
  const { network } = useApi();
  const { t } = useTranslation();

  const {
    loading: orderDetailLoading,
    data: orderDetailData,
    refetch: refetchOrderDetail,
  } = useMyQuery<TOrderDetail, { orderId: string }>(ORDER_DETAIL, {
    variables: { orderId: `${destination}-${orderid}` },
  });

  useEffect(() => {
    setRefresh(() => () => {
      refetchOrderDetail();
    });
  }, [setRefresh, refetchOrderDetail]);

  return (
    <>
      <Breadcrumb separator=">">
        <Breadcrumb.Item>
          <NavLink to={`${Path.feemarket}?tab=orders`}>{t('Orders')}</NavLink>
        </Breadcrumb.Item>
        <Breadcrumb.Item>{orderid}</Breadcrumb.Item>
      </Breadcrumb>

      <Card className="mt-1">
        <Spin spinning={orderDetailLoading}>
          <Descriptions column={1} title={<span className="text-sm font-bold text-black">{t('Detail')}</span>}>
            <Descriptions.Item label={t('Nonce')}>{orderid}</Descriptions.Item>
            <Descriptions.Item label={t('Lane ID')}>
              {orderDetailData?.order?.id.split('-')[1] || '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('Time Stamp')}>
              {orderDetailData?.order?.createBlockTime
                ? `${capitalize(
                    formatDistance(new Date(`${orderDetailData.order.createBlockTime}Z`), Date.now(), {
                      addSuffix: true,
                    })
                  )} ( ${format(new Date(orderDetailData.order.createBlockTime), DATE_TIME_FORMATE)} +UTC)`
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('Source TxID')}>
              {orderDetailData?.order?.sourceTxHash ? (
                <SubscanLink network={network.name} txHash={orderDetailData.order.sourceTxHash} />
              ) : (
                '-'
              )}
            </Descriptions.Item>
            <Descriptions.Item label={t('Sender')}>
              {orderDetailData?.order?.sender ? (
                <SubscanLink copyable address={orderDetailData.order.sender} network={network.name} />
              ) : (
                '-'
              )}
            </Descriptions.Item>
            <Descriptions.Item label={t('Status')}>
              {orderDetailData?.order?.status === 'Finished' ? (
                <Badge status="success" text={t('Finished')} />
              ) : (
                <Badge status="processing" text={t('In Progress')} />
              )}
            </Descriptions.Item>
            <Descriptions.Item label={t('Fee')}>
              {orderDetailData?.order?.fee
                ? `${fromWei({ value: orderDetailData.order.fee }, prettyNumber)} ${network.tokens.ring.symbol}`
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('Created At')}>
              {orderDetailData?.order?.createBlockNumber ? (
                <SubscanLink
                  network={network.name}
                  block={orderDetailData.order.createBlockNumber.toString()}
                  prefix="#"
                />
              ) : (
                '-'
              )}
            </Descriptions.Item>
            <Descriptions.Item label={t('Confirmed At')}>
              {orderDetailData?.order?.finishBlockNumber ? (
                <SubscanLink
                  network={network.name}
                  block={orderDetailData.order.finishBlockNumber.toString()}
                  prefix="#"
                />
              ) : (
                '-'
              )}
            </Descriptions.Item>
            <Descriptions.Item label={t('Slot At')}>
              {t(getPrioritySlot(orderDetailData?.order?.confirmedSlotIndex))}
            </Descriptions.Item>
            <Descriptions.Item label={t('Assigned Relayers')}>
              <div className="inline-flex items-center space-x-4">
                {orderDetailData?.order?.assignedRelayersId.map((relayer) => (
                  <AccountName key={relayer} account={relayer.split('-')[1]} copyable />
                ))}
              </div>
            </Descriptions.Item>
          </Descriptions>

          {orderDetailData?.order?.rewards?.nodes.length ? (
            <>
              <Descriptions
                column={1}
                className="mt-4"
                title={<span className="text-sm font-bold text-black">{t('Reward')}</span>}
              >
                {orderDetailData?.order?.rewards?.nodes[0]?.extrinsicIndex && (
                  <Descriptions.Item label={t('Extrinsic')}>
                    <SubscanLink
                      network={network.name}
                      extrinsic={{
                        height: orderDetailData.order.rewards.nodes[0].blockNumber,
                        index: orderDetailData.order.rewards.nodes[0].extrinsicIndex,
                      }}
                    />
                  </Descriptions.Item>
                )}
                {orderDetailData.order.rewards.nodes[0].assignedRelayersId?.map((relayer, index) => {
                  const amount = (orderDetailData.order?.rewards?.nodes[0].assignedAmounts as string[])[index];
                  return (
                    <Descriptions.Item label={t(RelayerRole.ASSIGNED)} key={index}>
                      <AccountName account={relayer.split('-')[1]} copyable />
                      <span>
                        &nbsp;
                        {`| +${fromWei({ value: amount }, prettyNumber)} ${network.tokens.ring.symbol}`}
                      </span>
                    </Descriptions.Item>
                  );
                })}
                {orderDetailData.order.rewards.nodes[0].deliveredRelayersId?.map((relayer, index) => {
                  const amount = (orderDetailData.order?.rewards?.nodes[0].deliveredAmounts as string[])[index];
                  return (
                    <Descriptions.Item label={t(RelayerRole.DELIVERY)} key={index}>
                      <AccountName account={relayer.split('-')[1]} copyable />
                      <span>
                        &nbsp;
                        {`| +${fromWei({ value: amount }, prettyNumber)} ${network.tokens.ring.symbol}`}
                      </span>
                    </Descriptions.Item>
                  );
                })}
                {orderDetailData.order.rewards.nodes[0].confirmedRelayersId?.map((relayer, index) => {
                  const amount = (orderDetailData.order?.rewards?.nodes[0].confirmedAmounts as string[])[index];
                  return (
                    <Descriptions.Item label={t(RelayerRole.CONFIRMATION)} key={index}>
                      <AccountName account={relayer.split('-')[1]} copyable />
                      <span>
                        &nbsp;
                        {`| +${fromWei({ value: amount }, prettyNumber)} ${network.tokens.ring.symbol}`}
                      </span>
                    </Descriptions.Item>
                  );
                })}
                {orderDetailData.order.rewards.nodes[0].treasuryAmount && (
                  <Descriptions.Item label={t('Treaury')}>{`+${fromWei(
                    { value: orderDetailData.order.rewards.nodes[0].treasuryAmount },
                    prettyNumber
                  )} ${network.tokens.ring.symbol}`}</Descriptions.Item>
                )}
              </Descriptions>
            </>
          ) : null}

          {orderDetailData?.order?.slashs?.nodes.length ? (
            <>
              <Descriptions column={1} title={<span className="text-sm font-bold text-black">{t('Slash')}</span>}>
                {orderDetailData?.order?.slashs?.nodes[0]?.extrinsicIndex && (
                  <Descriptions.Item label={t('Extrinsic')}>
                    <SubscanLink
                      network={network.name}
                      extrinsic={{
                        height: orderDetailData.order.slashs.nodes[0].blockNumber,
                        index: orderDetailData?.order?.slashs?.nodes[0]?.extrinsicIndex,
                      }}
                    />
                  </Descriptions.Item>
                )}
                {orderDetailData.order.slashs.nodes.map((slash) => (
                  <Descriptions.Item label={t(RelayerRole.ASSIGNED)} key={slash.relayerId}>
                    <AccountName account={slash.relayerId.split('-')[1]} copyable />
                    <span>
                      &nbsp;{`| -${fromWei({ value: slash.amount }, prettyNumber)} ${network.tokens.ring.symbol}`}
                    </span>
                  </Descriptions.Item>
                ))}
              </Descriptions>
            </>
          ) : null}
        </Spin>
      </Card>
    </>
  );
};
