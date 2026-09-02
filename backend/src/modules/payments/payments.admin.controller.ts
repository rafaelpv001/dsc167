import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentAdmin, AuthenticatedAdmin } from '../../common/decorators/current-admin.decorator';
import { PaymentsService } from './payments.service';

@Controller('api/admin/orders')
@UseGuards(JwtAuthGuard)
export class PaymentsAdminController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post(':id/approve')
  approve(
    @Param('id') orderId: string,
    @Body('note') note: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.paymentsService.confirmManually(orderId, admin.id, note);
  }

  @Post(':id/sync-payment')
  async sync(@Param('id') orderId: string) {
    const paymentId = await this.paymentsService.getPaymentIdForOrder(orderId);
    if (!paymentId) return { success: false };
    return this.paymentsService.syncPaymentStatus(paymentId);
  }
}
